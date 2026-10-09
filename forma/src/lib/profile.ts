// Профиль пользователя: нормы КБЖУ по анкете и описание для ИИ.

import type { FormaData, Goal, Macros, Profile } from '../types';
import { sortedWeight } from './calc';

export const GOALS: { id: Goal; l: string; ai: string }[] = [
  { id: 'gain', l: 'Набор массы', ai: 'набор массы, ориентир +0,25–0,5 кг в неделю' },
  { id: 'lose', l: 'Похудение', ai: 'снижение веса без потери мышц, ориентир −0,3–0,7 кг в неделю' },
  { id: 'keep', l: 'Поддержание', ai: 'поддержание веса и улучшение формы' },
];

export const goalText = (data: FormaData) => GOALS.find(g => g.id === (data.profile?.goal ?? 'gain'))!.ai;
export const userName = (data: FormaData) => data.profile?.name?.trim() || 'пользователь';

/**
 * Дневные нормы по формуле Миффлина — Сан Жеора с умеренной активностью (×1,55):
 * набор +15 %, похудение −15 %. Белок 1,6–2 г/кг, жиры ~25 % калорий, остальное — углеводы.
 */
export function calcTargets(p: Profile): Required<Macros> {
  const w = p.weight || 70, h = p.height || 175, a = p.age || 25;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'm' ? 5 : -161);
  const k = p.goal === 'gain' ? 1.15 : p.goal === 'lose' ? 0.85 : 1;
  const kcal = Math.round((bmr * 1.55 * k) / 50) * 50;
  const prot = Math.round(w * (p.goal === 'keep' ? 1.6 : p.goal === 'lose' ? 2 : 1.9));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4));
  return { kcal, p: prot, f: fat, c: carbs, fib: p.sex === 'm' ? 30 : 25 };
}

/** Короткое описание пользователя для системных промптов. */
export function aboutUser(data: FormaData) {
  const p = data.profile;
  const w = sortedWeight(data);
  const weight = w.length ? w[w.length - 1].value : p?.weight;
  const parts = [
    p ? `${userName(data)}, ${p.sex === 'f' ? 'женщина' : 'мужчина'}` : '',
    p?.age ? `${p.age} лет` : '',
    p?.height ? `рост ~${p.height} см` : '',
    weight ? `вес ~${weight} кг` : '',
    `цель — ${goalText(data)}`,
  ].filter(Boolean);
  return parts.join(', ') + '.' + (p?.note ? ' ' + p.note : '');
}

/** Пустой дневник для нового пользователя. */
export function emptyData(p: Profile, today: string): FormaData {
  return {
    schemaVersion: 2,
    profile: p,
    targets: calcTargets(p),
    oldBenchMax: 0,
    benchMax: 0,
    split: {},
    soberSince: '',
    sore: {},
    supplements: [],
    marks: {},
    weight: p.weight ? [{ date: today, value: p.weight }] : [],
    bench: [],
    products: [],
    days: [],
  };
}
