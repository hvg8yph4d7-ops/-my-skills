// Заявки на День открытых дверей: проверка, сохранение, список для админки.
// Хранилище — Netlify Blobs (бесплатно, встроено в Netlify, настраивать ничего не нужно).
// Логика принимает store как параметр, чтобы её можно было проверить без Netlify.

import { createHash, timingSafeEqual } from 'node:crypto';

export const SOURCES = ['Max', 'Telegram', 'WhatsApp', 'VK', 'Instagram', 'От знакомых', 'Другое', 'Не указано'];

// Пароль админки. Хранится не сам пароль, а его отпечаток (SHA-256), поэтому из кода его не узнать.
// Сменить: задать переменную окружения ADMIN_PASSWORD в Netlify (Site configuration → Environment variables).
const ADMIN_HASH = '77a3424ff4f294e5f7b43472d022695d70edaa556c08ffe13317c23a518c51fe';
const SALT = 'woodnext-open-day-2026';

const hash = (s) => createHash('sha256').update(SALT + ':' + s).digest();

export function checkPassword(given, env = {}) {
  if (typeof given !== 'string' || !given) return false;
  if (env.ADMIN_PASSWORD) {
    const a = hash(given), b = hash(env.ADMIN_PASSWORD);
    return timingSafeEqual(a, b);
  }
  return timingSafeEqual(hash(given), Buffer.from(ADMIN_HASH, 'hex'));
}

export function formatPhone(d) {
  return '+7 (' + d.slice(1, 4) + ') ' + d.slice(4, 7) + '-' + d.slice(7, 9) + '-' + d.slice(9, 11);
}

export function validate(d) {
  const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  let digits = String(d.phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '8') digits = '7' + digits.slice(1);
  const guests = parseInt(d.guests, 10);
  const source = SOURCES.includes(String(d.source)) ? String(d.source) : 'Не указано';
  const id = String(d.id || '').replace(/[^\w-]/g, '').slice(0, 40);

  if (name.length < 2) return { error: 'name' };
  if (digits.length !== 11 || digits[0] !== '7') return { error: 'phone' };
  if (!(guests >= 1 && guests <= 6)) return { error: 'guests' };
  if (!id) return { error: 'id' };
  return { name, phone: formatPhone(digits), digits, guests, source, id };
}

export async function listLeads(store) {
  const { blobs } = await store.list({ prefix: 'lead/' });
  const leads = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
  return leads.filter(Boolean).sort((a, b) => a.time.localeCompare(b.time));
}

export function totals(leads) {
  const ok = leads.filter((l) => !l.repeat);
  return { leads: ok.length, guests: ok.reduce((s, l) => s + l.guests, 0) };
}

/** Новая заявка. Возвращает { ok, duplicate?, lead?, totals? } или { ok:false, error }. */
export async function addLead(store, data, now = new Date()) {
  // Ловушка для ботов: скрытое поле заполнено или форма заполнена быстрее 2 секунд — делаем вид, что всё хорошо
  if (data.company || (Number(data.elapsed) > 0 && Number(data.elapsed) < 2)) return { ok: true, bot: true };

  const v = validate(data);
  if (v.error) return { ok: false, error: v.error };

  // Повторная отправка той же заявки (двойное нажатие, плохой интернет)
  if (await store.get('id/' + v.id)) return { ok: true, duplicate: true };

  const repeat = Boolean(await store.get('phone/' + v.digits));
  const time = now.toISOString();
  const key = 'lead/' + time.replace(/[:.]/g, '-') + '-' + v.id;
  const lead = { key, id: v.id, time, name: v.name, phone: v.phone, guests: v.guests, source: v.source, repeat, came: false };

  await store.setJSON(key, lead);
  await store.set('id/' + v.id, key);
  if (!repeat) await store.set('phone/' + v.digits, key);

  return { ok: true, lead, totals: totals(await listLeads(store)) };
}

export async function setCame(store, key, id, came) {
  if (typeof key !== 'string' || !key.startsWith('lead/')) return { ok: false, error: 'row' };
  const lead = await store.get(key, { type: 'json' });
  if (!lead || lead.id !== id) return { ok: false, error: 'moved' };
  lead.came = Boolean(came);
  await store.setJSON(key, lead);
  return { ok: true };
}

export async function removeLead(store, key, id) {
  if (typeof key !== 'string' || !key.startsWith('lead/')) return { ok: false, error: 'row' };
  const lead = await store.get(key, { type: 'json' });
  if (!lead || lead.id !== id) return { ok: false, error: 'moved' };
  await store.delete(key);
  await store.delete('id/' + lead.id);
  const digits = lead.phone.replace(/\D/g, '');
  if ((await store.get('phone/' + digits)) === key) await store.delete('phone/' + digits);
  return { ok: true };
}

const plural = (n, f) => {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? f[0] : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? f[1] : f[2];
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Уведомление в Telegram — только если в Netlify заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. */
export async function notifyTelegram(env, lead, t, fetchImpl = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const when = new Date(lead.time).toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const text = [
    '🏡 <b>Новая заявка — День открытых дверей</b>', '',
    '👤 ' + esc(lead.name), '📞 ' + esc(lead.phone),
    '👥 Человек: <b>' + lead.guests + '</b>', '📣 Источник: ' + esc(lead.source), '🕒 ' + when,
    lead.repeat ? '\n⚠️ Этот номер уже записывался — в итог заявка не добавлена.' : '', '',
    '<b>Всего записано: ' + t.guests + ' ' + plural(t.guests, ['человек', 'человека', 'человек']) +
      ' (' + t.leads + ' ' + plural(t.leads, ['заявка', 'заявки', 'заявок']) + ')</b>'
  ].join('\n');
  try {
    await fetchImpl('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true })
    });
  } catch (e) { console.error('Telegram', e); }
}
