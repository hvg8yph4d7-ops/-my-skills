// Google Gemini API (бесплатный тариф). Ключ хранится только на телефоне.
// Из России API не работает без VPN — Google отвечает «регион не поддерживается».

import * as z from 'zod/v4';
import type { Settings } from '../storage';
import { logError } from './bugs';
import { AiError, EntrySchema, type ChatTurn, type Entry, type ImageInput } from './ai';

/** Сообщение → части Gemini: вложения (фото, PDF как inline_data, текст файла) и сам текст. */
const turnParts = (t: ChatTurn): Part[] => [
  ...(t.files || []).map((f): Part => (f.kind === 'image' ? { inline_data: { mime_type: f.mediaType, data: f.data } }
    : f.kind === 'pdf' ? { inline_data: { mime_type: 'application/pdf', data: f.data } }
      : { text: `Файл «${f.name}»:\n${f.text}` })),
  { text: t.text },
];

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

type Part = { text?: string; thought?: boolean; inline_data?: { mime_type: string; data: string } };
type GeminiError = { error?: { code?: number; message?: string; status?: string } };

class GeminiHttpError extends Error {
  constructor(public status: number, public apiStatus: string, message: string) { super(message); }
}

async function call(key: string, path: string, body?: unknown) {
  const send = () => fetch(BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-goog-api-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let res: Response;
  try {
    res = await send();
  } catch (first) {
    // Сеть через VPN иногда моргает — одна повторная попытка через секунду.
    await new Promise(r => setTimeout(r, 1000));
    try {
      res = await send();
    } catch (e) {
      // Настоящая причина — в журнал для «Сообщить об ошибке» (ключ туда не попадает).
      const why = (x: unknown) => `${(x as Error)?.name || ''}: ${(x as Error)?.message || String(x)}`;
      logError(`Gemini fetch ${path.split('?')[0]} (${body ? 'POST' : 'GET'}, online=${navigator.onLine}): ${why(first)} / повтор: ${why(e)}`);
      throw new AiError('Нет связи с Gemini. Проверь интернет и что VPN включён.');
    }
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (json as GeminiError).error || {};
    throw new GeminiHttpError(res.status, e.status || '', e.message || '');
  }
  return json;
}

function explain(e: unknown): never {
  if (e instanceof AiError) throw e;
  if (e instanceof GeminiHttpError) {
    if (/location is not supported/i.test(e.message)) throw new AiError('Google не пускает из России. Включи VPN и попробуй ещё раз.');
    if (/API key not valid|API_KEY_INVALID/i.test(e.message) || e.status === 401) throw new AiError('Ключ Gemini не подходит. Проверь его в ⚙.');
    if (e.status === 403) throw new AiError('У ключа Gemini нет доступа. Проверь его в ⚙ (и что VPN включён).');
    if (e.status === 429) throw new AiError('Бесплатный лимит Gemini на сейчас закончился. Подожди минуту или до завтра, либо выбери в ⚙ модель Flash-Lite.');
    if (e.status === 404) throw new AiError('Эта модель Gemini больше не доступна. Выбери другую в ⚙.');
    if (e.status >= 500) throw new AiError('У Gemini временный сбой. Попробуй ещё раз.');
    throw new AiError(`Gemini не принял запрос (${e.status}): ${e.message}`);
  }
  throw e;
}

/** Текст ответа без «мыслей» модели. */
function answerText(json: unknown): string {
  const r = json as { candidates?: { content?: { parts?: Part[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
  if (r.promptFeedback?.blockReason) throw new AiError('Gemini отказался отвечать на это сообщение. Попробуй сформулировать иначе.');
  const c = r.candidates?.[0];
  const text = (c?.content?.parts || []).filter(p => !p.thought && p.text).map(p => p.text).join('').trim();
  if (!text) {
    if (c?.finishReason === 'MAX_TOKENS') throw new AiError('Gemini ответил не полностью. Раздели сообщение на части.');
    throw new AiError('Gemini вернул пустой ответ. Попробуй ещё раз.');
  }
  return text;
}

// Схема считается при первом вызове: модуль импортируется из ai.ts, и EntrySchema к этому моменту уже готова.
let entrySchemaCache: Record<string, unknown> | null = null;
const entryJsonSchema = () => {
  if (!entrySchemaCache) {
    const { $schema: _s, ...rest } = z.toJSONSchema(EntrySchema) as Record<string, unknown>;
    entrySchemaCache = rest;
  }
  return entrySchemaCache;
};

/** Приводим ответ к схеме: без строгой схемы Gemini может пропустить пустые поля. */
function toEntry(text: string, today: string): Entry {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new AiError('Gemini ответил не в том формате. Попробуй ещё раз.');
  }
  const filled = {
    date: today, food: [], exercises: [], weight: null, supps: null, gym: null, sore: [], questions: [], comment: '',
    ...raw,
  } as Record<string, unknown>;
  filled.food = ((filled.food as Record<string, unknown>[]) || []).map(f => ({ fib: 0, product: null, note: null, grams: null, source: 'estimate', ...f }));
  filled.exercises = ((filled.exercises as Record<string, unknown>[]) || []).map(x => ({ group: null, isBench: false, sets: [], ...x }));
  const parsed = EntrySchema.safeParse(filled);
  if (!parsed.success) throw new AiError('Gemini ответил с ошибкой в данных. Попробуй ещё раз.');
  // Числа КБЖУ — целые, как во всём дневнике.
  parsed.data.food = parsed.data.food.map(f => ({ ...f, p: Math.round(f.p), f: Math.round(f.f), c: Math.round(f.c), kcal: Math.round(f.kcal), fib: Math.round(f.fib) }));
  return parsed.data;
}

export async function geminiEntry(settings: Settings, system: string, user: string, today: string, image?: ImageInput): Promise<Entry> {
  const parts: Part[] = [];
  if (image) parts.push({ inline_data: { mime_type: image.mediaType, data: image.data } });
  parts.push({ text: user });
  const body = (strict: boolean) => ({
    systemInstruction: {
      parts: [{ text: strict ? system : system + '\n\nОтветь только JSON по этой схеме, без пояснений:\n' + JSON.stringify(entryJsonSchema()) }],
    },
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', ...(strict ? { responseJsonSchema: entryJsonSchema() } : {}) },
  });
  const path = `/models/${settings.geminiModel}:generateContent`;
  try {
    let json;
    try {
      json = await call(settings.geminiKey, path, body(true));
    } catch (e) {
      // Если модель не приняла схему ответа — повторяем со схемой в тексте промпта.
      if (e instanceof GeminiHttpError && e.status === 400 && !/API key|location/i.test(e.message)) json = await call(settings.geminiKey, path, body(false));
      else throw e;
    }
    return toEntry(answerText(json), today);
  } catch (e) {
    explain(e);
  }
}

export const geminiText = (settings: Settings, system: string, user: string) =>
  geminiChat(settings, system, [{ role: 'user', text: user }]);

export async function geminiChat(settings: Settings, system: string, turns: ChatTurn[]): Promise<string> {
  try {
    const json = await call(settings.geminiKey, `/models/${settings.geminiModel}:generateContent`, {
      systemInstruction: { parts: [{ text: system }] },
      contents: turns.map(t => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.text }] })),
    });
    return answerText(json);
  } catch (e) {
    explain(e);
  }
}

/** Список моделей Gemini, доступных ключу, — подходящие для текста и фото (Flash), новые сверху. */
export async function geminiModels(key: string): Promise<{ id: string; name: string }[]> {
  try {
    const json = await call(key, '/models?pageSize=1000') as { models?: { name: string; displayName?: string; supportedGenerationMethods?: string[] }[] };
    return (json.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({ id: m.name.replace(/^models\//, ''), name: m.displayName || m.name }))
      .filter(m => /flash/i.test(m.id) && !/tts|image|audio|live|embed|thinking-exp|native/i.test(m.id))
      .sort((a, b) => b.id.localeCompare(a.id, 'en', { numeric: true }));
  } catch (e) {
    explain(e);
  }
}

/** Модель по умолчанию: самая новая стабильная Flash-Lite (у неё самый щедрый бесплатный лимит). */
export function pickDefaultModel(models: { id: string }[]) {
  const stable = models.filter(m => !/preview|exp/i.test(m.id));
  return (stable.find(m => /lite/i.test(m.id)) || stable[0] || models[0])?.id || '';
}

/** Ответ строго по zod-схеме (для советника). При 400 — повтор со схемой в тексте промпта. */
export async function geminiStructured<T>(settings: Settings, system: string, turns: ChatTurn[], schema: z.ZodType<T>): Promise<T> {
  const { $schema: _s, ...json } = z.toJSONSchema(schema) as Record<string, unknown>;
  const contents = turns.map(t => ({ role: t.role === 'user' ? 'user' : 'model', parts: turnParts(t) }));
  const body = (strict: boolean) => ({
    systemInstruction: { parts: [{ text: strict ? system : system + '\n\nОтветь только JSON по этой схеме, без пояснений:\n' + JSON.stringify(json) }] },
    contents,
    generationConfig: { responseMimeType: 'application/json', ...(strict ? { responseJsonSchema: json } : {}) },
  });
  const path = `/models/${settings.geminiModel}:generateContent`;
  try {
    let res;
    try {
      res = await call(settings.geminiKey, path, body(true));
    } catch (e) {
      if (e instanceof GeminiHttpError && e.status === 400 && !/API key|location/i.test(e.message)) res = await call(settings.geminiKey, path, body(false));
      else throw e;
    }
    let raw: unknown;
    try { raw = JSON.parse(answerText(res).replace(/^```(?:json)?\s*|\s*```$/g, '')); }
    catch (e) { if (e instanceof AiError) throw e; throw new AiError('Gemini ответил не в том формате. Попробуй ещё раз.'); }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new AiError('Gemini ответил с ошибкой в данных. Попробуй ещё раз.');
    return parsed.data;
  } catch (e) {
    explain(e);
  }
}
