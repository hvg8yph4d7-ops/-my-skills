// Разовые записи в дневник Давида, которые он попросил внести за него (из чата с Claude Code).
// Применяются один раз к дневнику с seedRev (его), отмечаются в data.patches и дальше не повторяются.

import type { FormaData } from '../types';
import { applyEntry, type EntryFood } from './entry';

type Patch = { id: string; label: string; skip?: (d: FormaData) => boolean; apply: (d: FormaData) => FormaData };

const food = (name: string, grams: number, p: number, f: number, c: number, kcal: number, fib: number, note: string | null = null): EntryFood =>
  ({ name, grams, p, f, c, kcal, fib, source: 'label', product: null, note });

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
