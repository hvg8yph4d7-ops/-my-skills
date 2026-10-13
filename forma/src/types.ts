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

/** Подход. Диапазон «10–12» хранится как reps 10 + repsMax 12; для расчётов берётся нижняя граница. */
export interface ExSet {
  weight: number | null; // null — свой вес или вес не записан
  reps: number | null; // null — повторы не записаны (например, дроп-сет)
  repsMax?: number | null;
  note?: string; // «дроп-сет»
}

export interface Exercise {
  name: string;
  group: string | null;
  sets: ExSet[];
  note?: string; // «суперсет»
  src?: string; // исходная строка из чата, из которой сделано упражнение (схема v3)
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
  talk?: string; // как советнику со мной разговаривать (стиль)
}

export interface FormaData {
  profile?: Profile;
  schemaVersion: number;
  updatedAt?: string; // когда дневник меняли последний раз — для синхронизации с сервером
  ownerId?: string; // id аккаунта, к которому привязан дневник на этом телефоне
  seedRev?: string; // какая выгрузка из чата уже влита (exportedAt из forma-data.json)
  exportedAt?: string;
  targets: Macros & { fib: number };
  oldBenchMax: number;
  benchMax: number;
  split: Record<string, string>; // индекс дня недели (Пн=0) → что тренировать
  soberSince: string;
  sore: Record<string, string>; // группа → дата отметки «ещё болит»
  supplements: { time: string; items: string }[];
  suppRules?: string[]; // правила приёма — подсказка под схемой добавок
  suppRev?: string; // какое обновление схемы добавок уже применено
  patches?: string[]; // какие разовые записи (src/lib/patches.ts) уже внесены
  marks: Record<string, { p: boolean; g: boolean }>; // p — добавки, g — зал
  weight: { date: string; value: number }[];
  /** Устарело с v3: подходы жима живут в упражнении «Жим штанги лёжа». Остаётся только у старых копий до миграции. */
  bench?: { date: string; w: number; r: number }[];
  /** Свой список синонимов упражнений (вкладка «Прогресс»). Нет — встроенный. */
  exerciseAliases?: import('./lib/exercises').Alias[];
  products: Product[];
  days: Day[];
}
