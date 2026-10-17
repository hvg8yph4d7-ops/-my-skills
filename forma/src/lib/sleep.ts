// Сон из Apple Health: приходит на сервер через «Команды», приложение кладёт его в data.sleep[дата подъёма].

import type { FormaData, SleepRec } from '../types';

/** Меньше этого — «мало спал» (подсвечиваем жёлтым, советник не предлагает рекорды). */
export const SLEEP_OK_MIN = 7 * 60;

export const sleepText = (min: number) => `${Math.floor(min / 60)} ч${min % 60 ? ` ${min % 60} мин` : ''}`;
export const sleepShort = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
export const sleepLow = (min: number) => min < SLEEP_OK_MIN;

/** «🌙 7 ч 20 мин · 23:40–07:00». */
export const sleepLine = (s: SleepRec) => `🌙 ${sleepText(s.min)}${s.bed && s.wake ? ` · ${s.bed}–${s.wake}` : ''}`;

/** Сон за ночь перед днём date (ключ — дата подъёма). */
export const sleepFor = (d: FormaData, date: string) => d.sleep?.[date];

/** Вливает записи с сервера. Возвращает null, если ничего не изменилось (чтобы не трогать дневник зря). */
export function mergeSleep(d: FormaData, rows: { date: string; bed: string | null; wake: string | null; minutes: number }[]): FormaData | null {
  const cur = d.sleep || {};
  const next = { ...cur };
  let changed = false;
  for (const r of rows) {
    const rec: SleepRec = { min: r.minutes, ...(r.bed ? { bed: r.bed } : {}), ...(r.wake ? { wake: r.wake } : {}) };
    const old = cur[r.date];
    if (old && old.min === rec.min && old.bed === rec.bed && old.wake === rec.wake) continue;
    next[r.date] = rec;
    changed = true;
  }
  return changed ? { ...d, sleep: next } : null;
}

/** Секретный токен для «Команд»: 48 случайных шестнадцатеричных символов. */
export function newSleepToken() {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/** Вливает шаги с сервера. null — ничего не изменилось. */
export function mergeSteps(d: FormaData, rows: { date: string; steps: number }[]): FormaData | null {
  const cur = d.steps || {};
  const changed = rows.filter(r => cur[r.date] !== r.steps);
  if (!changed.length) return null;
  return { ...d, steps: { ...cur, ...Object.fromEntries(changed.map(r => [r.date, r.steps])) } };
}

const plural = (n: number, a: string, b: string, c: string) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c;
};
/** «👣 8 432 шага». */
export const stepsLine = (n: number) => `👣 ${n.toLocaleString('ru-RU')} ${plural(n, 'шаг', 'шага', 'шагов')}`;
