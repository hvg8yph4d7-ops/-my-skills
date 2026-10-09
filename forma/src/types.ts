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

export interface FormaData {
  schemaVersion: number;
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
