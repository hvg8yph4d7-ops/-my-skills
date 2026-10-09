// Claude API (платно). Ключ хранится только на телефоне, запрос идёт прямо из браузера.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { Settings } from '../storage';
import { AiError, EntrySchema, type Entry, type ImageInput } from './ai';

function client(s: Settings) {
  return new Anthropic({ apiKey: s.apiKey, dangerouslyAllowBrowser: true });
}

/** Opus 5.5 поддерживает серверный запасной вариант при отказе; Haiku 5.5 — нет. */
function fallbackParams(s: Settings) {
  return s.model === 'claude-opus-5-5'
    ? { betas: ['server-side-fallback-2026-07-01'] as Anthropic.Beta.AnthropicBeta[], fallbacks: 'default' as const }
    : {};
}

function explain(e: unknown): never {
  if (e instanceof AiError) throw e;
  if (e instanceof Anthropic.AuthenticationError) throw new AiError('Ключ Claude не подходит. Проверь его в ⚙.');
  if (e instanceof Anthropic.PermissionDeniedError) throw new AiError('У ключа нет доступа к этой модели.');
  if (e instanceof Anthropic.RateLimitError) throw new AiError('Слишком много запросов или кончились деньги на балансе. Проверь console.anthropic.com.');
  if (e instanceof Anthropic.BadRequestError) throw new AiError('Claude не принял запрос: ' + e.message);
  if (e instanceof Anthropic.APIConnectionError) throw new AiError('Нет связи с Claude. Проверь интернет.');
  if (e instanceof Anthropic.APIError) throw new AiError(`Ошибка Claude (${e.status}). Попробуй ещё раз.`);
  throw e;
}

export async function claudeEntry(settings: Settings, system: string, user: string, image?: ImageInput): Promise<Entry> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({ type: 'text', text: user });
  try {
    const res = await client(settings).beta.messages.parse({
      model: settings.model,
      max_tokens: 16000,
      cache_control: { type: 'ephemeral' },
      output_config: { effort: 'medium', format: betaZodOutputFormat(EntrySchema) },
      system,
      messages: [{ role: 'user', content }],
      ...fallbackParams(settings),
    });
    if (res.stop_reason === 'refusal') throw new AiError('Claude отказался разбирать это сообщение. Попробуй сформулировать иначе.');
    if (res.stop_reason === 'max_tokens' || !res.parsed_output) throw new AiError('Claude ответил не полностью. Попробуй ещё раз или раздели сообщение.');
    return res.parsed_output;
  } catch (e) {
    explain(e);
  }
}

export async function claudeText(settings: Settings, system: string, user: string): Promise<string> {
  try {
    const res = await client(settings).beta.messages.create({
      model: settings.model,
      max_tokens: 16000,
      output_config: { effort: 'low' },
      system,
      messages: [{ role: 'user', content: user }],
      ...fallbackParams(settings),
    });
    if (res.stop_reason === 'refusal') throw new AiError('Claude не смог ответить. Попробуй ещё раз.');
    const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
    if (!text) throw new AiError('Claude вернул пустой ответ. Попробуй ещё раз.');
    return text;
  } catch (e) {
    explain(e);
  }
}
