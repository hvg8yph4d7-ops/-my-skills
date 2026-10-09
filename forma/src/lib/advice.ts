// Действия советника: ИИ предлагает изменения дневника, пользователь применяет их кнопкой.

import * as z from 'zod/v4';
import type { Day, FormaData } from '../types';
import { GROUPS } from './calc';
import { addMacros, applyEntry, removeExercise, removeMeal } from './entry';
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
    'update_food', 'update_exercise', 'set_day_text', 'set_day_macros', 'set_groups', 'clear_sore', 'remove_weight',
    'remove_bench', 'set_sober_since', 'set_profile',
  ]).describe(
    'add_food: date + food; remove_food: date + index (номер позиции «Записано в приложении»); ' +
    'add_exercise: date + exercise; remove_exercise: date + index; set_weight: date + number (кг); ' +
    'set_marks: date + supps и/или gym (true/false); close_day: date + text (вывод дня); reopen_day: date; ' +
    'set_targets: targets; set_split: split (7 строк Пн..Вс, пусто = отдых); set_sore: group; ' +
    'set_note: text (ВЕСЬ новый текст «о себе»: прежний + новое); set_bench_max: number; set_supplements: supplements; ' +
    'update_food: date + index (#N «записано в приложении») + food (одна позиция — новая версия); ' +
    'update_exercise: date + index (#N упражнения) + exercise (новая версия); ' +
    'set_day_text: date + field + для food/training — lines (ВЕСЬ новый список строк), для остальных полей — text (пусто = удалить); ' +
    'set_day_macros: date + macros (новый итог дня, когда правишь старые строки еды); set_groups: date + groups (группы мышц дня, пусто = не тренировался); ' +
    'clear_sore: group (снять «ещё болит»); remove_weight: date; remove_bench: date + index (номер подхода жима в этот день, с 0); ' +
    'set_sober_since: date (с какого дня без алкоголя); set_profile: profile (анкета: имя, пол, возраст, рост, вес, цель)',
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
  field: z.enum(['food', 'training', 'work', 'supps', 'trainNote', 'verdict']).nullable()
    .describe('Для set_day_text: food — строки еды, training — строки тренировки, work — описание дня, supps — добавки, trainNote — заметка о тренировке, verdict — вывод дня'),
  lines: z.array(z.string()).nullable(),
  groups: z.array(z.enum(GROUP_KEYS)).nullable(),
  macros: z.object({ p: z.number(), f: z.number(), c: z.number(), kcal: z.number(), fib: z.number() }).nullable(),
  profile: z.object({
    name: z.string(), sex: z.enum(['m', 'f']), age: z.number().nullable(), height: z.number().nullable(),
    weight: z.number().nullable(), goal: z.enum(['gain', 'lose', 'keep']),
  }).nullable(),
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
      if (a.index == null || !day?.meals?.[a.index]) throw new Error('такой позиции нет');
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
    case 'update_food': {
      const date = needDate(a);
      const day = d.days.find(x => x.date === date);
      const f = a.food?.[0];
      if (a.index == null || !day?.meals?.[a.index]) throw new Error('такой позиции нет');
      if (!f) throw new Error('нет новой версии продукта');
      const old = day.meals[a.index];
      const item = { ...old, name: f.name, grams: f.grams, p: r(f.p), f: r(f.f), c: r(f.c), kcal: r(f.kcal), fib: r(f.fib) };
      return mapDay(d, date, x => ({
        ...x,
        meals: x.meals!.map((m, i) => (i === a.index ? item : m)),
        macros: addMacros(addMacros(x.macros, [old], -1), [item]),
      }));
    }
    case 'update_exercise': {
      const date = needDate(a);
      const day = d.days.find(x => x.date === date);
      if (a.index == null || !day?.exercises?.[a.index]) throw new Error('такого упражнения нет');
      if (!a.exercise) throw new Error('нет новой версии упражнения');
      const ex = { name: a.exercise.name, group: a.exercise.group, sets: a.exercise.sets };
      return mapDay(d, date, x => {
        const groups = new Set(x.groups || []);
        if (ex.group) groups.add(ex.group);
        return { ...x, exercises: x.exercises!.map((e, i) => (i === a.index ? ex : e)), ...(groups.size ? { groups: [...groups] } : {}) };
      });
    }
    case 'set_day_text': {
      const date = needDate(a);
      if (!a.field) throw new Error('не указано, что менять в дне');
      const field = a.field;
      const value = field === 'food' || field === 'training'
        ? (a.lines || []).map(s => s.trim()).filter(Boolean)
        : (a.text || '').trim();
      const day = d.days.find(x => x.date === date);
      const set = (x: Day): Day => {
        const n: Record<string, unknown> = { ...x };
        if ((Array.isArray(value) && !value.length) || value === '') delete n[field];
        else n[field] = value;
        return n as unknown as Day;
      };
      // День ещё не заведён — создаём (например, вписать описание сегодняшнего дня).
      if (!day) return { ...d, days: [...d.days, set({ date, partial: true })].sort((x, y) => x.date.localeCompare(y.date)) };
      return mapDay(d, date, set);
    }
    case 'set_day_macros': {
      const m = a.macros;
      if (!m || !(m.kcal >= 0 && m.kcal < 15000)) throw new Error('странный итог дня');
      return mapDay(d, needDate(a), x => ({ ...x, macros: { p: r(m.p), f: r(m.f), c: r(m.c), kcal: r(m.kcal), fib: r(m.fib) } }));
    }
    case 'set_groups': {
      const groups = a.groups || [];
      return mapDay(d, needDate(a), x => {
        const n = { ...x };
        if (groups.length) n.groups = [...new Set(groups)]; else delete n.groups;
        return n;
      });
    }
    case 'clear_sore': {
      if (!a.group) throw new Error('не указана группа мышц');
      const sore = { ...d.sore };
      delete sore[a.group];
      return { ...d, sore };
    }
    case 'remove_weight': {
      const date = needDate(a);
      if (!d.weight.some(w => w.date === date)) throw new Error('в этот день веса нет');
      return { ...d, weight: d.weight.filter(w => w.date !== date) };
    }
    case 'remove_bench': {
      const date = needDate(a);
      const idx = d.bench.map((b, i) => (b.date === date ? i : -1)).filter(i => i >= 0);
      const kill = idx[a.index ?? -1];
      if (kill == null) throw new Error('такого подхода жима нет');
      return { ...d, bench: d.bench.filter((_, i) => i !== kill) };
    }
    case 'set_sober_since':
      return { ...d, soberSince: needDate(a) };
    case 'set_profile': {
      const p = a.profile;
      if (!p || !p.name.trim()) throw new Error('нет анкеты');
      return { ...d, profile: { ...d.profile, ...p, name: p.name.trim(), note: d.profile?.note } };
    }
  }
}

/** Подробности действия для карточки: что именно добавится (с КБЖУ), чтобы было видно до «Применить». */
export function actionDetails(a: Action): string[] {
  const r = Math.round;
  if (a.type === 'add_food' && a.food?.length) {
    const lines = a.food.map(f => `${f.name}${f.grams ? `, ${r(f.grams)} г` : ''} — Б ${r(f.p)} · Ж ${r(f.f)} · У ${r(f.c)} · ${r(f.kcal)} ккал`);
    if (a.food.length > 1) {
      const sum = (k: 'p' | 'f' | 'c' | 'kcal') => r(a.food!.reduce((s, f) => s + f[k], 0));
      lines.push(`Итого: Б ${sum('p')} · Ж ${sum('f')} · У ${sum('c')} · ${sum('kcal')} ккал`);
    }
    return lines;
  }
  if (a.type === 'update_food' && a.food?.[0]) {
    const f = a.food[0];
    return [`Станет: ${f.name}${f.grams ? `, ${r(f.grams)} г` : ''} — Б ${r(f.p)} · Ж ${r(f.f)} · У ${r(f.c)} · ${r(f.kcal)} ккал`];
  }
  if (a.type === 'set_day_macros' && a.macros) return [`Итог дня: Б ${r(a.macros.p)} · Ж ${r(a.macros.f)} · У ${r(a.macros.c)} · ${r(a.macros.kcal)} ккал`];
  if (a.type === 'set_day_text') return a.lines?.length ? a.lines.map(l => '• ' + l) : a.text ? [a.text] : ['(будет удалено)'];
  if (a.type === 'set_groups') return [a.groups?.length ? a.groups.join(', ') : '(без групп)'];
  if (a.type === 'update_exercise' && a.exercise) return [`Станет: ${a.exercise.name} — ${a.exercise.sets.map(s => (s.weight != null ? `${s.weight}×${s.reps}` : `${s.reps} повт.`)).join(', ') || 'без подходов'}`];
  if (a.type === 'add_exercise' && a.exercise?.sets.length) {
    return [a.exercise.sets.map(s => (s.weight != null ? `${s.weight}×${s.reps}` : `${s.reps} повт.`)).join(', ')];
  }
  return [];
}

const STATUS_TEXT = { applied: 'применено', skipped: 'пропущено', stale: 'устарело' } as const;
/** Как предложения прошлого ответа выглядят для модели в истории — чтобы не предлагала то же самое снова. */
export function actionsNote(actions: Action[], status: (keyof typeof STATUS_TEXT | null)[] | undefined) {
  return '\n[Мои предложения: ' + actions.map((a, j) => `«${a.summary}» — ${STATUS_TEXT[status?.[j] as keyof typeof STATUS_TEXT] || 'ещё не решено'}`).join('; ') + ']';
}

const norm = (x: string) => x.toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]+/g, ' ').trim();

/** Это уже есть в дневнике на эту дату? Тогда предложение не показываем (модель любит повторять). */
export function alreadyDone(d: FormaData, a: Action): boolean {
  const day = a.date ? d.days.find(x => x.date === a.date) : undefined;
  if (a.type === 'add_exercise' && a.exercise) {
    const name = norm(a.exercise.name);
    return !!day && [...(day.exercises || []).map(e => e.name), ...(day.training || [])].some(n => norm(n).includes(name));
  }
  if (a.type === 'add_food' && a.food?.length) {
    const have = (day?.meals || []).map(m => norm(m.name));
    return a.food.every(f => have.includes(norm(f.name)));
  }
  if (a.type === 'set_weight') return d.weight.some(w => w.date === a.date && w.value === a.number);
  return false;
}
