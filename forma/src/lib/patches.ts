// Разовые записи в дневник Давида, которые он попросил внести за него (из чата с Claude Code).
// Применяются один раз к дневнику с seedRev (его), отмечаются в data.patches и дальше не повторяются.

import type { FormaData } from '../types';
import { applyEntry, removeMeal, type EntryExercise, type EntryFood } from './entry';

type Patch = { id: string; label: string; skip?: (d: FormaData) => boolean; apply: (d: FormaData) => FormaData };

const food = (name: string, grams: number, p: number, f: number, c: number, kcal: number, fib: number, note: string | null = null, source: EntryFood['source'] = 'label'): EntryFood =>
  ({ name, grams, p, f, c, kcal, fib, source, product: null, note });

/** Упражнение: подходы «вес/повторы» строкой, например '50/12 70/10'. */
const ex = (name: string, group: string, sets: string, isBench = false): EntryExercise => ({
  name, group, isBench,
  sets: sets.split(' ').map(x => { const [w, r] = x.split('/').map(Number); return { weight: w, reps: r, repsMax: null }; }),
});

const blank = (date: string) => ({ date, food: [], exercises: [], weight: null, supps: null, gym: null, sore: [], questions: [], comment: '' });

export const PATCHES: Patch[] = [
  {
    id: '2026-10-13-farsh',
    label: 'фарш, макароны и чипсы за 13 октября',
    // Если уже записал сам — не дублируем.
    skip: d => {
      const names = (d.days.find(x => x.date === '2026-10-13')?.meals || []).map(m => m.name.toLowerCase());
      return names.some(n => n.includes('фарш')) && names.some(n => n.includes('чипс'));
    },
    apply: d => applyEntry(d, blank('2026-10-13'), [
      food('Фарш свинина + говядина (МПК Атяшевский), сырой', 200, 24, 70, 0, 726, 0, 'этикетка: на 100 г Б 12, Ж 35, 363 ккал'),
      food('Макароны Макфа, сухие', 225, 27, 3, 159, 770, 8),
      food('Чипсы Litenergy паприка', 120, 7, 48, 55, 684, 4, 'этикетка: на 100 г Б 5,5, Ж 40, У 46, 570 ккал'),
    ], []),
  },
  {
    id: '2026-11-04-chest',
    label: 'тренировка груди и трицепса за 4 ноября',
    // Если уже записал сам (есть жим 70×10 в этот день) — не дублируем.
    skip: d => !!d.days.find(x => x.date === '2026-11-04')?.exercises?.some(e => /жим штанги/i.test(e.name) && e.sets.some(s => s.weight === 70 && s.reps === 10)),
    apply: d => applyEntry(d, { ...blank('2026-11-04'), gym: true }, [], [
      ex('Жим штанги лёжа', 'грудь', '50/12 70/10 70/10 70/8', true),
      ex('Жим гантелей лёжа', 'грудь', '28/12 28/10 28/8'),
      ex('Хаммер на грудь', 'грудь', '25/12 25/10 20/12'),
      ex('Бабочка', 'грудь', '50/12 50/10 45/12'),
      ex('Жим гантели из-за головы', 'трицепс', '24/10 22/12 22/12'),
      ex('Разгибания в кроссовере', 'трицепс', '50/10 50/10 45/12'),
    ]),
  },
  {
    id: '2026-11-04-pasta-chicken',
    label: 'макароны 265 г и жареная курица 165 г за 4 ноября',
    skip: d => !!d.days.find(x => x.date === '2026-11-04')?.meals?.some(m => /курица.*жарен|жарен.*курица/i.test(m.name)),
    apply: d => applyEntry(d, blank('2026-11-04'), [
      // Готовые макароны: Б 3,5, Ж 0,5, У 25, 130 ккал на 100 г (правило из чата).
      food('Макароны готовые', 265, 9, 1, 66, 345, 5, null, 'base'),
      // Жареная курица (грудка на масле): ~Б 30, Ж 7, 187 ккал на 100 г.
      food('Курица жареная', 165, 50, 12, 0, 309, 0, 'на 100 г ≈ Б 30, Ж 7, 187 ккал', 'estimate'),
    ], []),
  },
  {
    id: '2026-11-05-kcal-3400',
    label: 'нормы подняты: 3400 ккал (было 3100)',
    // Уже поднял сам — не трогаем.
    skip: d => d.targets.kcal >= 3400,
    // Вес перестал расти на 3100 → +300 ккал, в основном углеводами. Б 140·4 + Ж 95·9 + У 495·4 ≈ 3395.
    apply: d => ({ ...d, targets: { kcal: 3400, p: 140, f: 95, c: 495, fib: 30 } }),
  },
  {
    // Давид сам уже записал макароны 265 г и «Куриную грудку жареную» 165 г — запись выше их задвоила
    // (проверка искала «курица», а у него «куриная»). Убираем то, что добавила запись «за тебя».
    id: '2026-11-04-undupe',
    label: 'убран дубль: макароны 265 г и курица жареная 165 г за 4 ноября',
    skip: d => {
      const meals = d.days.find(x => x.date === '2026-11-04')?.meals || [];
      return !meals.some(m => m.name === 'Курица жареная' && m.grams === 165) || meals.filter(m => m.name === 'Макароны готовые' && m.grams === 265).length < 2;
    },
    apply: d => {
      const meals = d.days.find(x => x.date === '2026-11-04')!.meals!;
      const last = (f: (m: (typeof meals)[number]) => boolean) => meals.map((m, i) => (f(m) ? i : -1)).filter(i => i >= 0).pop()!;
      const idx = [last(m => m.name === 'Курица жареная' && m.grams === 165), last(m => m.name === 'Макароны готовые' && m.grams === 265)].sort((a, b) => b - a);
      return idx.reduce((x, i) => removeMeal(x, '2026-11-04', i), d);
    },
  },
  {
    id: '2026-11-05-pasta-chicken',
    label: 'макароны 375 г и жареная курица 250 г за 5 ноября',
    // Уже записал сам (макароны 375 г или курица/куриное 250 г) — не дублируем. Ищем по основе «кур», не по слову целиком.
    skip: d => !!d.days.find(x => x.date === '2026-11-05')?.meals?.some(m => (/макарон/i.test(m.name) && m.grams === 375) || (/кур/i.test(m.name) && m.grams === 250)),
    apply: d => applyEntry(d, blank('2026-11-05'), [
      food('Макароны готовые', 375, 13, 2, 94, 488, 7, null, 'base'),
      food('Курица жареная', 250, 75, 18, 0, 468, 0, 'на 100 г ≈ Б 30, Ж 7, 187 ккал', 'estimate'),
    ], []),
  },
  {
    // 6–9 ноября праздники: пил просекко, ел как попало, ничего не записывал. Дни — праздник (не в средние, не рвут серию),
    // счётчик «Без алкоголя» не сбрасываем, только пометка.
    id: '2026-11-06-holidays',
    label: '6–9 ноября отмечены праздником, просекко — пометкой у «Без алкоголя»',
    apply: d => {
      const dates = ['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09'];
      const note = 'праздники, ел как попало, не записывал';
      const have = new Set(d.days.map(x => x.date));
      const days = [
        ...d.days.map(x => (dates.includes(x.date) ? { ...x, holiday: note, partial: false } : x)),
        ...dates.filter(x => !have.has(x)).map(date => ({ date, holiday: note, partial: false })),
      ].sort((a, b) => a.date.localeCompare(b.date));
      const drinks = [...(d.drinks || []).filter(x => !dates.includes(x.date)), ...dates.map(date => ({ date, note: 'просекко' }))];
      return { ...d, days, drinks };
    },
  },
  {
    // Уточнение Давида: просекко пил только 6-го; 7–9 — просто праздник без алкоголя.
    id: '2026-11-06-drinks-fix',
    label: 'просекко — только 6 ноября',
    skip: d => !(d.drinks || []).some(x => ['2026-11-07', '2026-11-08', '2026-11-09'].includes(x.date)),
    apply: d => ({ ...d, drinks: (d.drinks || []).filter(x => !['2026-11-07', '2026-11-08', '2026-11-09'].includes(x.date)) }),
  },
  {
    id: '2026-11-10-breakfast',
    label: 'завтрак 10 ноября: макароны по-флотски 500 г и глазированный сырок 40 г',
    // Уже записал сам — не дублируем (ищем по основам слов, не по точному названию).
    skip: d => !!d.days.find(x => x.date === '2026-11-10')?.meals?.some(m => /флотск|фарш/i.test(m.name) || /сыр[оa]к|глазир/i.test(m.name)),
    apply: d => applyEntry(d, blank('2026-11-10'), [
      // Его обычное блюдо (куриный фарш + пачка макарон); на 100 г как в его записи 4.11: Б 8,1 · Ж 5,1 · У 21,1 · 162 ккал.
      food('Макароны по-флотски с куриным фаршем', 500, 40, 26, 105, 809, 5, 'на 100 г ≈ Б 8, Ж 5, У 21, 162 ккал — как 4 ноября', 'estimate'),
      food('Сырок глазированный, клубничный наполнитель', 40, 3, 9, 15, 152, 0, 'этикетка: на 100 г Б 7, Ж 23, У 37, 380 ккал'),
    ], []),
  },
];

export const pendingPatches = (d: FormaData) => (d.seedRev ? PATCHES.filter(p => !(d.patches || []).includes(p.id)) : []);

/** Применяет все ожидающие записи. Возвращает новый дневник и что было добавлено. */
export function applyPatches(d: FormaData): { data: FormaData; added: string[] } {
  let data = d;
  const added: string[] = [];
  for (const p of pendingPatches(d)) {
    if (!p.skip?.(data)) { data = p.apply(data); added.push(p.label); }
    data = { ...data, patches: [...(data.patches || []), p.id] };
  }
  return { data, added };
}
