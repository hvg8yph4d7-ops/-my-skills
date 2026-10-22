// Слияние дневника телефона с дневником на сервере, когда его поменял кто-то другой (тренер записал еду),
// а на телефоне тем временем тоже были правки. Трёхстороннее: base — версия, с которой телефон начинал.

import type { Day, FormaData } from '../types';
import { addMacros } from './entry';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Поле поменяли только на одной стороне — берём её; на обеих — свою (телефон). */
const pick = <T>(base: T, local: T, remote: T): T => (same(local, base) ? remote : local);

/** Список: что телефон добавил и убрал относительно base, накладываем поверх серверного. */
function mergeList<T>(base: T[] = [], local: T[] = [], remote: T[] = []) {
  const key = (x: T) => JSON.stringify(x);
  const b = base.map(key), l = local.map(key);
  const added = local.filter((_, i) => !b.includes(l[i]));
  const removed = base.filter((_, i) => !l.includes(b[i]));
  const rm = removed.map(key);
  const out = [...remote.filter(x => !rm.includes(key(x))), ...added.filter(x => !remote.some(r => key(r) === key(x)))];
  return { out, added, removed };
}

function mergeDay(base: Day | undefined, local: Day, remote: Day): Day {
  const b = base || { date: local.date };
  const meals = mergeList(b.meals, local.meals, remote.meals);
  const exercises = mergeList(b.exercises, local.exercises, remote.exercises);
  const out: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(b)]) as Set<keyof Day>) {
    if (k === 'meals' || k === 'exercises' || k === 'macros') continue;
    const v = pick(b[k], local[k], remote[k]);
    if (v !== undefined) out[k] = v;
  }
  if (meals.out.length) out.meals = meals.out;
  if (exercises.out.length) out.exercises = exercises.out;
  // Итог дня: серверный + еда, которую добавил/убрал телефон. Если телефон правил итог вручную — его.
  let macros = remote.macros;
  if (meals.added.length || meals.removed.length) macros = addMacros(addMacros(remote.macros, meals.added), meals.removed, -1);
  else if (!same(b.macros, local.macros)) macros = local.macros;
  if (macros) out.macros = macros;
  return out as unknown as Day;
}

/** Слить: base — общий предок, local — телефон, remote — сервер (поменял кто-то другой). */
export function merge3(base: FormaData, local: FormaData, remote: FormaData): FormaData {
  const out: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(local), ...Object.keys(remote)]) as Set<keyof FormaData>) {
    if (k === 'days' || k === 'marks' || k === 'weight') continue;
    const v = pick(base[k], local[k], remote[k]);
    if (v !== undefined) out[k] = v;
  }
  // Отметки — по дням.
  const marks: FormaData['marks'] = {};
  for (const d of new Set([...Object.keys(local.marks), ...Object.keys(remote.marks), ...Object.keys(base.marks)])) {
    const v = pick(base.marks[d], local.marks[d], remote.marks[d]);
    if (v) marks[d] = v;
  }
  out.marks = marks;
  // Вес — по датам.
  const wb = new Map(base.weight.map(w => [w.date, w.value])), wl = new Map(local.weight.map(w => [w.date, w.value])), wr = new Map(remote.weight.map(w => [w.date, w.value]));
  out.weight = [...new Set([...wl.keys(), ...wr.keys(), ...wb.keys()])].sort()
    .map(date => ({ date, value: pick(wb.get(date), wl.get(date), wr.get(date)) }))
    .filter((w): w is { date: string; value: number } => w.value != null);
  // Дни — по датам.
  const db = new Map(base.days.map(d => [d.date, d])), dl = new Map(local.days.map(d => [d.date, d])), dr = new Map(remote.days.map(d => [d.date, d]));
  out.days = [...new Set([...dl.keys(), ...dr.keys()])].sort().flatMap(date => {
    const b = db.get(date), l = dl.get(date), r = dr.get(date);
    if (l && r) return [same(l, b) ? r : same(r, b) ? l : mergeDay(b, l, r)];
    // День есть только с одной стороны: другая его удалила (тогда он был в base и не менялся) — или он новый.
    const one = (l || r)!;
    if (b && same(one, b)) return [];
    return [one];
  });
  return out as unknown as FormaData;
}

/** Содержимое дневника без служебных отметок времени и владельца. */
const content = (d: FormaData) => JSON.stringify({ ...d, updatedAt: undefined, ownerId: undefined });

export type SyncPlan = { kind: 'same' | 'remote' | 'local' } | { kind: 'merge'; data: FormaData };

/**
 * Что делать с дневником телефона и сервера, зная общего предка base. Сравниваем содержимое, а не время:
 * часы телефонов могут врать, а «побеждает свежий» стирал запись тренера, если клиент потом что-то отметил.
 */
export function syncPlan(base: FormaData, local: FormaData, remote: FormaData): SyncPlan {
  const b = content(base), l = content(local), r = content(remote);
  if (l === r) return { kind: 'same' };
  if (l === b) return { kind: 'remote' };
  if (r === b) return { kind: 'local' };
  return { kind: 'merge', data: merge3(base, local, remote) };
}
