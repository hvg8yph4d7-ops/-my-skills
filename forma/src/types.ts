// Модель данных «Формы». Совпадает с forma-data.json + номер версии схемы.

export interface Macros {
  p: number;
  f: number;
  c: number;
  kcal: number;
  fib?: number;
}

/** Позиция еды, распознанная Claude (этап 2). Старые дни хранят еду строками в `food`. */
export interface FoodItem {
  name: string;
  grams: number | null;
  p: number;
  f: number;
  c: number;
  kcal: number;
  fib: number;
  source: 'label' | 'base' | 'estimate'; // этикетка / справочник / оценка
  note?: string | null;
}

export interface Exercise {
  name: string;
  group: string | null;
  sets: { weight: number | null; reps: number }[];
}

export interface Day {
  date: string; // YYYY-MM-DD
  partial?: boolean; // день ещё не закрыт — в средние не идёт
  groups?: string[];
  trainNote?: string;
  work?: string;
  food?: string[];
  training?: string[];
  supps?: string;
  macros?: Macros; // итог дня: старые строки + сумма meals
  verdict?: string;
  meals?: FoodItem[];
  exercises?: Exercise[];
}

export interface Product extends Macros {
  name: string;
  portion: string;
  times: number;
  note?: string;
}

export type Goal = 'gain' | 'lose' | 'keep';

/** Анкета пользователя: от неё считаются нормы и на неё опирается ИИ. */
export interface Profile {
  name: string;
  sex: 'm' | 'f';
  age: number | null;
  height: number | null; // см
  weight: number | null; // кг, на момент анкеты
  goal: Goal;
  note?: string; // свободный текст о себе для ИИ
}

export interface FormaData {
  profile?: Profile;
  schemaVersion: number;
  seedRev?: string; // какая выгрузка из чата уже влита (exportedAt из forma-data.json)
  exportedAt?: string;
  targets: Macros & { fib: number };
  oldBenchMax: number;
  benchMax: number;
  split: Record<string, string>; // индекс дня недели (Пн=0) → что тренировать
  soberSince: string;
  sore: Record<string, string>; // группа → дата отметки «ещё болит»
  supplements: { time: string; items: string }[];
  marks: Record<string, { p: boolean; g: boolean }>; // p — добавки, g — зал
  weight: { date: string; value: number }[];
  bench: { date: string; w: number; r: number }[];
  products: Product[];
  days: Day[];
}
