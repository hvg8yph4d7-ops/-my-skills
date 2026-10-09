// Разбор свободного ввода («250 г курицы, жим 70 на 5», фото этикетки) через Claude API.
// Ключ хранится только на телефоне пользователя, запрос идёт прямо из браузера.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';
import type { Day, FormaData } from '../types';
import type { Settings } from '../storage';
import { GROUPS } from './calc';
import { longD, wdName } from './format';

const GROUP_KEYS = GROUPS.map(g => g.k) as [string, ...string[]];

export const EntrySchema = z.object({
  date: z.string().describe('Дата записи YYYY-MM-DD. По умолчанию сегодня; «вчера» — вчерашняя дата.'),
  food: z.array(z.object({
    name: z.string().describe('Короткое название по-русски, с уточнением: «Курица готовая», «Макароны Макфа, сухие»'),
    grams: z.number().nullable().describe('Съеденный вес в граммах или null, если штучно/неизвестно'),
    p: z.number(), f: z.number(), c: z.number(), kcal: z.number(), fib: z.number(),
    source: z.enum(['label', 'base', 'estimate']).describe('label — с этикетки на фото, base — справочник/правила, estimate — оценка'),
    product: z.string().nullable().describe('Точное название из справочника частых продуктов, если это он, иначе null'),
    note: z.string().nullable().describe('Короткая пометка, например «вычел 2 желтка», или null'),
  })),
  exercises: z.array(z.object({
    name: z.string(),
    group: z.enum(GROUP_KEYS).nullable(),
    isBench: z.boolean().describe('true только для жима штанги лёжа'),
    sets: z.array(z.object({ weight: z.number().nullable(), reps: z.number() })),
  })),
  weight: z.number().nullable().describe('Вес тела в кг, если назван'),
  supps: z.boolean().nullable().describe('true, если сказал, что пил добавки'),
  gym: z.boolean().nullable().describe('true, если был в зале'),
  sore: z.array(z.enum(GROUP_KEYS)).describe('Группы мышц, про которые сказал «ещё болит»'),
  questions: z.array(z.string()).describe('Уточняющие вопросы, без которых расчёт неточный. Пусто, если всё ясно'),
  comment: z.string().describe('1–2 коротких предложения: что записал и на что обратить внимание'),
});
export type Entry = z.infer<typeof EntrySchema>;

function client(s: Settings) {
  return new Anthropic({ apiKey: s.apiKey, dangerouslyAllowBrowser: true });
}

/** Opus 5.5 поддерживает серверный запасной вариант при отказе; Haiku 5.5 — нет. */
function fallbackParams(s: Settings) {
  return s.model === 'claude-opus-5-5'
    ? { betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[], fallbacks: 'default' as const }
    : {};
}

// Системный промпт не меняется от запроса к запросу — так он кэшируется и стоит дешевле.
function systemPrompt(data: FormaData) {
  const t = data.targets;
  const products = data.products
    .map(p => `- ${p.name} (${p.portion}): Б ${p.p}, Ж ${p.f}, У ${p.c}, ${p.kcal} ккал, клетч. ${p.fib ?? 0}${p.note ? ' — ' + p.note : ''}`)
    .join('\n');
  return `Ты ведёшь дневник питания и тренировок Давида в приложении «Форма». Он пишет коротко, по-русски, часто с опечатками и голосовым вводом, иногда присылает фото этикеток. Твоя задача — превратить сообщение в структурированную запись.

О пользователе: рост ~180 см, вес ~68 кг, цель — набор массы. Цели в день: ${t.kcal} ккал, белок ≥ ${t.p} г, жиры до ~${t.f} г, углеводы ~${t.c} г, клетчатка ${t.fib} г. Взвешивается в зале во время тренировки.

Правила расчёта КБЖУ (выработаны вместе с ним, соблюдай):
- Этикетка важнее базы: если на фото есть КБЖУ с упаковки — бери с неё и пересчитывай на съеденный вес (source = "label").
- Макароны: если не сказано, сухой или готовый вес — задай вопрос в questions, а в расчёте прими готовый вес. Готовые ≈ в 2,5 раза тяжелее сухих. Сухие (Макфа) на 100 г: Б 12, Ж 1,3, У 70,5, 342 ккал. Готовые: Б 3,5, Ж 0,5, У 25, 130 ккал. «Пачка» = 450–500 г сухих, уточни.
- Курица/грудка готовая на 100 г: Б 30, Ж 3,5, 165 ккал. Сырая ≈ Б 23.
- Яйца: категория важна (С0 крупнее, ~65 г). Если не съел желтки — вычти их и отметь в note.
- Если блюдо приготовлено на весь день или на несколько человек — считай только съеденную часть.
- Если продукт есть в справочнике ниже — бери его значения на порцию (source = "base") и укажи его точное название в product.
- Клетчатку оценивай примерно, не пропускай.
- Числа округляй до целых (вес продукта и КБЖУ).

Тренировки:
- Каждое упражнение — отдельная запись, группа мышц из списка: ${GROUP_KEYS.join(', ')}. Если упражнение не про эти группы (пресс, кардио) — group = null.
- «Жим 70 на 5» — это подходы: weight 70, reps 5. Жим штанги лёжа помечай isBench = true. Жим гантелей и тренажёры — isBench = false.
- Если перечислены упражнения — значит был в зале: gym = true.
- «Ещё болит грудь» → sore = ["грудь"].

Добавки: «добавки пил», «выпил креатин» → supps = true.

Если в сообщении нет чего-то из разделов — оставь пустой список или null. Ничего не выдумывай: если сомневаешься в весе или составе — оцени разумно (source = "estimate") и задай короткий вопрос.

Справочник частых продуктов (значения на порцию):
${products}`;
}

function dayContext(day: Day | undefined) {
  if (!day) return 'Записей за этот день пока нет.';
  const parts = [];
  if (day.food?.length) parts.push('Еда: ' + day.food.join('; '));
  if (day.meals?.length) parts.push('Уже записано: ' + day.meals.map(m => m.name + (m.grams ? ` ${m.grams} г` : '')).join('; '));
  if (day.exercises?.length) parts.push('Упражнения: ' + day.exercises.map(e => e.name).join('; '));
  if (day.macros) parts.push(`Итог дня сейчас: Б ${day.macros.p}, Ж ${day.macros.f}, У ${day.macros.c}, ${day.macros.kcal} ккал`);
  return parts.join('\n') || 'Записей за этот день пока нет.';
}

export class ClaudeError extends Error {}

function explain(e: unknown): never {
  if (e instanceof Anthropic.AuthenticationError) throw new ClaudeError('Ключ API не подходит. Проверь его в ⚙.');
  if (e instanceof Anthropic.PermissionDeniedError) throw new ClaudeError('У ключа нет доступа к этой модели.');
  if (e instanceof Anthropic.RateLimitError) throw new ClaudeError('Слишком много запросов или кончились деньги на балансе. Проверь console.anthropic.com.');
  if (e instanceof Anthropic.BadRequestError) throw new ClaudeError('Claude не принял запрос: ' + e.message);
  if (e instanceof Anthropic.APIConnectionError) throw new ClaudeError('Нет связи с Claude. Проверь интернет.');
  if (e instanceof Anthropic.APIError) throw new ClaudeError(`Ошибка Claude (${e.status}). Попробуй ещё раз.`);
  throw e;
}

export interface ImageInput { mediaType: 'image/jpeg'; data: string }

export async function parseEntry(opts: { settings: Settings; data: FormaData; today: string; text: string; image?: ImageInput }): Promise<Entry> {
  const { settings, data, today, text, image } = opts;
  const yesterday = new Date(today + 'T12:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({
    type: 'text',
    text: `Сегодня ${today} (${longD(today)}, ${wdName(today)}). Вчера было ${yesterday.toISOString().slice(0, 10)}.\n` +
      `Что уже записано сегодня:\n${dayContext(data.days.find(d => d.date === today))}\n\n` +
      `Сообщение:\n${text || '(только фото)'}`,
  });
  try {
    const res = await client(settings).beta.messages.parse({
      model: settings.model,
      max_tokens: 16000,
      cache_control: { type: 'ephemeral' },
      output_config: { effort: 'medium', format: betaZodOutputFormat(EntrySchema) },
      system: systemPrompt(data),
      messages: [{ role: 'user', content }],
      ...fallbackParams(settings),
    });
    if (res.stop_reason === 'refusal') throw new ClaudeError('Claude отказался разбирать это сообщение. Попробуй сформулировать иначе.');
    if (res.stop_reason === 'max_tokens' || !res.parsed_output) throw new ClaudeError('Claude ответил не полностью. Попробуй ещё раз или раздели сообщение.');
    return res.parsed_output;
  } catch (e) {
    if (e instanceof ClaudeError) throw e;
    explain(e);
  }
}

/** Короткий «вывод дня», как в переписке: честно, без занудства. */
export async function dayVerdict(opts: { settings: Settings; data: FormaData; day: Day }): Promise<string> {
  const { settings, data, day } = opts;
  const t = data.targets, m = day.macros;
  const lines = [
    `День ${longD(day.date)}, ${wdName(day.date)}.`,
    dayContext(day),
    day.training?.length ? 'Тренировка: ' + day.training.join('; ') : '',
    m ? `Итог: Б ${m.p} г, Ж ${m.f} г, У ${m.c} г, ${m.kcal} ккал, клетчатка ${m.fib ?? 0} г.` : 'КБЖУ не посчитаны.',
    `Цели: ${t.kcal} ккал, белок ≥ ${t.p}, жиры до ~${t.f}, углеводы ~${t.c}, клетчатка ${t.fib}. Цель — набор массы.`,
  ].filter(Boolean).join('\n');
  try {
    const res = await client(settings).beta.messages.create({
      model: settings.model,
      max_tokens: 16000,
      output_config: { effort: 'low' },
      system: 'Ты пишешь короткий «вывод дня» для дневника питания и тренировок Давида. 2–3 предложения по-русски, на «ты»: что хорошо, что подтянуть завтра. Честно указывай на проблемы (перебор жира, мало белка или калорий), но без занудства и без списков. Только сам вывод, без заголовков.',
      messages: [{ role: 'user', content: lines }],
      ...fallbackParams(settings),
    });
    if (res.stop_reason === 'refusal') throw new ClaudeError('Claude не смог написать вывод. Попробуй ещё раз.');
    const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
    if (!text) throw new ClaudeError('Claude вернул пустой ответ. Попробуй ещё раз.');
    return text;
  } catch (e) {
    if (e instanceof ClaudeError) throw e;
    explain(e);
  }
}

/** Сжимает фото до 1568 px по длинной стороне — так дешевле и быстрее. */
export async function prepareImage(file: File): Promise<ImageInput> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL('image/jpeg', 0.85);
  return { mediaType: 'image/jpeg', data: url.slice(url.indexOf(',') + 1) };
}
