// Как подтверждённая запись от Claude попадает в данные.

import type { Day, Exercise, FoodItem, FormaData, Macros } from '../types';
import type { Entry } from './claude';

export type EntryFood = Entry['food'][number];
export type EntryExercise = Entry['exercises'][number];

/** Пересчёт КБЖУ позиции под новый вес (пропорционально). */
export function scaleFood(f: EntryFood, grams: number): EntryFood {
  if (!f.grams || f.grams <= 0) return { ...f, grams };
  const k = grams / f.grams;
  const r = (n: number) => Math.round(n * k);
  return { ...f, grams, p: r(f.p), f: r(f.f), c: r(f.c), kcal: r(f.kcal), fib: r(f.fib) };
}

const ZERO: Required<Macros> = { p: 0, f: 0, c: 0, kcal: 0, fib: 0 };

/** Итог дня меняется на сумму позиций (sign = -1 при удалении). Старые строки уже учтены в macros. */
function addMacros(m: Macros | undefined, items: FoodItem[], sign = 1): Macros {
  const base = { ...ZERO, ...m, fib: m?.fib ?? 0 };
  const out = items.reduce((a, x) => ({
    p: a.p + sign * x.p, f: a.f + sign * x.f, c: a.c + sign * x.c, kcal: a.kcal + sign * x.kcal, fib: a.fib + sign * x.fib,
  }), base);
  const r = (n: number) => Math.max(0, Math.round(n));
  return { p: r(out.p), f: r(out.f), c: r(out.c), kcal: r(out.kcal), fib: r(out.fib) };
}

export const foodLine = (x: FoodItem) =>
  `${x.name}${x.grams ? `, ${x.grams} г` : ''} — Б ${x.p} · Ж ${x.f} · У ${x.c} · ${x.kcal} ккал`;

export const exerciseLine = (x: Exercise) => {
  const sets = x.sets.map(s => (s.weight != null ? `${String(s.weight).replace('.', ',')}×${s.reps}` : `${s.reps} повт.`));
  return x.name + (sets.length ? ': ' + sets.join(', ') : '');
};

export function applyEntry(d: FormaData, e: Entry, food: EntryFood[], exercises: EntryExercise[]): FormaData {
  const date = e.date;
  const old = d.days.find(x => x.date === date);
  const day: Day = old ? { ...old } : { date, partial: true };

  const meals: FoodItem[] = food.map(({ product: _p, ...f }) => f);
  if (meals.length) {
    day.meals = [...(day.meals || []), ...meals];
    day.macros = addMacros(day.macros, meals);
  }
  const ex: Exercise[] = exercises.map(({ isBench: _b, ...x }) => x);
  if (ex.length) {
    day.exercises = [...(day.exercises || []), ...ex];
    const groups = new Set(day.groups || []);
    ex.forEach(x => x.group && groups.add(x.group));
    if (groups.size) day.groups = [...groups];
  }

  const days = old ? d.days.map(x => (x.date === date ? day : x)) : [...d.days, day];

  const bench = [...d.bench];
  exercises.filter(x => x.isBench).forEach(x => x.sets.forEach(s => {
    if (s.weight != null) bench.push({ date, w: s.weight, r: s.reps });
  }));

  const mark = { ...(d.marks[date] || { p: false, g: false }) };
  if (e.supps) mark.p = true;
  if (e.gym || ex.length) mark.g = true;

  const sore = { ...d.sore };
  e.sore.forEach(g => { sore[g] = date; });

  const weight = e.weight != null
    ? [...d.weight.filter(w => w.date !== date), { date, value: Math.round(e.weight * 100) / 100 }]
    : d.weight;

  const used = new Set(food.map(f => f.product).filter(Boolean));
  const products = used.size ? d.products.map(p => (used.has(p.name) ? { ...p, times: p.times + 1 } : p)) : d.products;

  return { ...d, days, bench, weight, sore, products, marks: { ...d.marks, [date]: mark } };
}

/** Удаляет позицию еды из дня и вычитает её из итога. */
export function removeMeal(d: FormaData, date: string, i: number): FormaData {
  return {
    ...d,
    days: d.days.map(x => {
      if (x.date !== date || !x.meals?.[i]) return x;
      return { ...x, meals: x.meals.filter((_, j) => j !== i), macros: addMacros(x.macros, [x.meals[i]], -1) };
    }),
  };
}

export function removeExercise(d: FormaData, date: string, i: number): FormaData {
  return {
    ...d,
    days: d.days.map(x => (x.date === date && x.exercises ? { ...x, exercises: x.exercises.filter((_, j) => j !== i) } : x)),
  };
}

/** Есть ли в записи хоть что-то, что можно сохранить. */
export const entryHasData = (e: Entry) =>
  e.food.length > 0 || e.exercises.length > 0 || e.weight != null || !!e.supps || !!e.gym || e.sore.length > 0;
