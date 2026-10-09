// Расчёты — 1-в-1 как в старом трекере (CLAUDE.md, раздел 4).

import type { FormaData, Macros } from '../types';
import { daysBetween } from './format';

/** Расчётный максимум по Эпли: w × (1 + reps / 30). */
export const e1rm = (e: { w: number; r: number }) => Math.round(e.w * (1 + e.r / 30) * 10) / 10;

export const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);
export const sortedWeight = (d: FormaData) => d.weight.slice().sort(byDate);
export const sortedBench = (d: FormaData) => d.bench.slice().sort(byDate);
export const dayFor = (d: FormaData, k: string) => d.days.find(x => x.date === k);
export const marksFor = (d: FormaData, k: string) => d.marks[k] || { p: false, g: false };

/** Дни плана по сплиту (Пн=0), по возрастанию. */
export const planDays = (d: FormaData) => Object.keys(d.split).map(Number).sort((a, b) => a - b);

/** Средние КБЖУ только по закрытым дням. */
export function averages(d: FormaData): { n: number; avg: Required<Macros> } | null {
  const full = d.days.filter(x => x.macros && !x.partial);
  if (!full.length) return null;
  const sum = full.reduce((a, x) => {
    const m = x.macros!;
    return { p: a.p + (m.p || 0), f: a.f + (m.f || 0), c: a.c + (m.c || 0), kcal: a.kcal + (m.kcal || 0), fib: a.fib + (m.fib || 0) };
  }, { p: 0, f: 0, c: 0, kcal: 0, fib: 0 });
  const n = full.length;
  return { n, avg: { p: sum.p / n, f: sum.f / n, c: sum.c / n, kcal: sum.kcal / n, fib: sum.fib / n } };
}

/** Оценка среднего относительно цели. dir: 'up' — надо больше, 'down' — надо меньше. */
export function rate(val: number, target: number, dir: 'up' | 'down'): { cls: 'ok' | 'lo' | 'hi'; txt: string } {
  const ratio = val / target;
  if (dir === 'up' && ratio < 0.8) return { cls: 'lo', txt: 'мало, цель ' + target };
  if (dir === 'down' && ratio > 1.2) return { cls: 'hi', txt: 'много, цель ' + target };
  if (dir === 'up' && ratio > 1.5) return { cls: 'hi', txt: 'с запасом' };
  return { cls: 'ok', txt: 'в норме' };
}

export const GROUPS = [
  { k: 'грудь', l: 'Грудь', s: 'Г', c: '#f5c542', big: true },
  { k: 'спина', l: 'Спина', s: 'С', c: '#35a67c', big: true },
  { k: 'ноги', l: 'Ноги', s: 'Н', c: '#6fa8dc', big: true },
  { k: 'плечи', l: 'Плечи', s: 'П', c: '#e07a5f', big: true },
  { k: 'бицепс', l: 'Бицепс', s: 'Б', c: '#b39ddb', big: false },
  { k: 'трицепс', l: 'Трицепс', s: 'Т', c: '#9ccc65', big: false },
];
export type Group = (typeof GROUPS)[number];
export const groupOf = (k: string) => GROUPS.find(g => g.k === k);

export const gymDays = (d: FormaData) =>
  d.days.filter(x => x.groups && x.groups.length).sort((a, b) => b.date.localeCompare(a.date));

export type RecoveryStatus = 'ready' | 'soon' | 'early' | 'long';

/**
 * Восстановление группы мышц. Большим группам нужно 3 дня, рукам 2, > 8 дней — «давно не было».
 * Ручная отметка «ещё болит» держится 2 дня и важнее календаря.
 */
export function recovery(d: FormaData, g: Group, today: string) {
  const gd = gymDays(d);
  const last = gd.find(x => x.groups!.includes(g.k));
  const times = gd.filter(x => x.groups!.includes(g.k)).length;
  if (!last) return null;
  const ago = daysBetween(last.date, today);
  const need = g.big ? 3 : 2;
  const soreAt = d.sore && d.sore[g.k];
  const soreNow = !!soreAt && soreAt >= last.date && daysBetween(soreAt, today) <= 1;
  let cls: RecoveryStatus, txt: string;
  if (soreNow) { cls = 'early'; txt = 'ещё болит — по ощущениям'; }
  else if (ago > 8) { cls = 'long'; txt = 'давно не было'; }
  else if (ago >= need) { cls = 'ready'; txt = 'восстановилась'; }
  else if (ago === need - 1) { cls = 'soon'; txt = 'почти готова'; }
  else { cls = 'early'; txt = 'ещё рано'; }
  return { last, times, ago, cls, txt };
}

/** Количество упражнений: строки тренировок без заметок про боль. */
export const exerciseCount = (d: FormaData) =>
  gymDays(d).reduce((a, x) => a + (x.training ? x.training.filter(t => !/заболел|болел/i.test(t)).length : 0) + (x.exercises?.length || 0), 0);
