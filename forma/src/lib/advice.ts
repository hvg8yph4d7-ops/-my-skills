// Действия советника: ИИ предлагает изменения дневника, пользователь применяет их кнопкой.

import * as z from 'zod/v4';
import type { FormaData } from '../types';
import { GROUPS } from './calc';
import { applyEntry, removeExercise, removeMeal } from './entry';
import type { Entry } from './ai';

const GROUP_KEYS = GROUPS.map(g => g.k) as [string, ...string[]];

const Food = z.object({
  name: z.string(), grams: z.number().nullable(),
  p: z.number(), f: z.number(), c: z.number(), kcal: z.number(), fib: z.number(),
});

/** Одно предлагаемое изменение. Плоская схема с null — её понимают и Gemini, и Claude. */
export const ActionSchema = z.object({
  type: z.enum([
    'add_food', 'remove_food', 'add_exercise', 'remove_exercise', 'set_weight', 'set_marks',
    'close_day', 'reopen_day', 'set_targets', 'set_split', 'set_sore', 'set_note', 'set_bench_max', 'set_supplements',
  ]).describe(
    'add_food: date + food; remove_food: date + index (номер позиции «Записано в приложении»); ' +
    'add_exercise: date + exercise; remove_exercise: date + index; set_weight: date + number (кг); ' +
    'set_marks: date + supps и/или gym (true/false); close_day: date + text (вывод дня); reopen_day: date; ' +
    'set_targets: targets; set_split: split (7 строк Пн..Вс, пусто = отдых); set_sore: group; ' +
    'set_note: text (о пользователе для ИИ); set_bench_max: number; set_supplements: supplements',
  ),
  summary: z.string().describe('Коротко по-русски, что изменится, например «Вес 68,6 кг на 10 октября»'),
  date: z.string().nullable().describe('YYYY-MM-DD'),
  number: z.number().nullable(),
  index: z.number().nullable(),
  text: z.string().nullable(),
  supps: z.boolean().nullable(),
  gym: z.boolean().nullable(),
  group: z.enum(GROUP_KEYS).nullable(),
  food: z.array(Food).nullable(),
  exercise: z.object({
    name: z.string(), group: z.enum(GROUP_KEYS).nullable(), isBench: z.boolean(),
    sets: z.array(z.object({ weight: z.number().nullable(), reps: z.number() })),
  }).nullable(),
  targets: z.object({ kcal: z.number(), p: z.number(), f: z.number(), c: z.number(), fib: z.number() }).nullable(),
  split: z.array(z.string()).nullable(),
  supplements: z.array(z.object({ time: z.string(), items: z.string() })).nullable(),
});
export type Action = z.infer<typeof ActionSchema>;

export const AdviceSchema = z.object({
  reply: z.string().describe('Ответ пользователю'),
  actions: z.array(ActionSchema).describe('Изменения дневника, которые ты предлагаешь. Пусто, если менять ничего не нужно'),
});
export type Advice = z.infer<typeof AdviceSchema>;

/** Пустая запись — чтобы переиспользовать applyEntry для еды и упражнений. */
const blankEntry = (date: string): Entry => ({
  date, food: [], exercises: [], weight: null, supps: null, gym: null, sore: [], questions: [], comment: '',
});

const needDate = (a: Action) => { if (!a.date || !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) throw new Error('не указана дата'); return a.date; };
const mapDay = (d: FormaData, date: string, fn: (x: FormaData['days'][number]) => FormaData['days'][number]) => {
  if (!d.days.some(x => x.date === date)) throw new Error('в этот день нет записей');
  return { ...d, days: d.days.map(x => (x.date === date ? fn(x) : x)) };
};
const r = (n: number) => Math.round(n);

/** Применить действие. Бросает Error с понятным текстом, если действие некорректно. */
export function applyAction(d: FormaData, a: Action): FormaData {
  switch (a.type) {
    case 'add_food': {
      const date = needDate(a);
      if (!a.food?.length) throw new Error('нет продуктов');
      const food = a.food.map(f => ({ ...f, p: r(f.p), f: r(f.f), c: r(f.c), kcal: r(f.kcal), fib: r(f.fib), source: 'estimate' as const, product: null, note: null }));
      return applyEntry(d, blankEntry(date), food, []);
    }
    case 'add_exercise': {
      const date = needDate(a);
      if (!a.exercise) throw new Error('нет упражнения');
      return applyEntry(d, blankEntry(date), [], [a.exercise]);
    }
    case 'remove_food': {
      const date = needDate(a);
      const day = d.days.find(x => x.date === date);
      if (a.index == null || !day?.meals?.[a.index]) throw new Error('такой позиции нет (старые записи из чата удалять нельзя)');
      return removeMeal(d, date, a.index);
    }
    case 'remove_exercise': {
      const date = needDate(a);
      const day = d.days.find(x => x.date === date);
      if (a.index == null || !day?.exercises?.[a.index]) throw new Error('такого упражнения нет');
      return removeExercise(d, date, a.index);
    }
    case 'set_weight': {
      const date = needDate(a);
      if (!(a.number && a.number > 20 && a.number < 300)) throw new Error('странный вес');
      return { ...d, weight: [...d.weight.filter(w => w.date !== date), { date, value: Math.round(a.number * 100) / 100 }] };
    }
    case 'set_marks': {
      const date = needDate(a);
      const m = d.marks[date] || { p: false, g: false };
      return { ...d, marks: { ...d.marks, [date]: { p: a.supps ?? m.p, g: a.gym ?? m.g } } };
    }
    case 'close_day':
      return mapDay(d, needDate(a), x => ({ ...x, partial: false, ...(a.text ? { verdict: a.text } : {}) }));
    case 'reopen_day':
      return mapDay(d, needDate(a), x => ({ ...x, partial: true }));
    case 'set_targets': {
      const t = a.targets;
      if (!t || !(t.kcal > 500 && t.kcal < 8000)) throw new Error('странные нормы');
      return { ...d, targets: { kcal: r(t.kcal), p: r(t.p), f: r(t.f), c: r(t.c), fib: r(t.fib) } };
    }
    case 'set_split': {
      if (!a.split) throw new Error('нет плана');
      return { ...d, split: Object.fromEntries(a.split.slice(0, 7).map((v, i) => [String(i), v.trim()]).filter(([, v]) => v)) };
    }
    case 'set_sore':
      if (!a.group) throw new Error('не указана группа мышц');
      return { ...d, sore: { ...d.sore, [a.group]: a.date || new Date().toISOString().slice(0, 10) } };
    case 'set_note':
      if (!d.profile) throw new Error('нет профиля');
      return { ...d, profile: { ...d.profile, note: a.text?.trim() || undefined } };
    case 'set_bench_max':
      if (!(a.number && a.number > 0 && a.number < 400)) throw new Error('странный вес');
      return { ...d, benchMax: a.number };
    case 'set_supplements':
      if (!a.supplements) throw new Error('нет схемы');
      return { ...d, supplements: a.supplements.filter(s => s.time.trim() || s.items.trim()) };
  }
}
