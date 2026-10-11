// Схема добавок Давида от 11.10.2026 (его просьба): добавлен цинк, обновлено расписание и правила.
// Применяется один раз к его дневнику (тот, что из чата, — с seedRev), дальше схему правят в ⚙ или через советника.

import type { FormaData } from '../types';

export const SUPP_REV = '2026-10-11';

export const SUPPS_2026_10_11: FormaData['supplements'] = [
  { time: 'Утро, с едой', items: 'Омега-3 — 3 капсулы · Витамин D · Магний цитрат — 2 таблетки' },
  { time: 'Обед, с едой', items: 'Витамин C 900 мг (шипучий, VitaScience) + цинк (шипучий, VitaScience) — растворять вместе в одном стакане воды · Креатин — 5 г' },
  { time: 'Вечер, за 1–2 часа до сна', items: 'Магний — 1 таблетка' },
];

export const RULES_2026_10_11 = [
  'Цинк и магний — с интервалом минимум 2 часа.',
  'Цинк не натощак.',
];

/** Нужно ли обновить схему добавок в этом дневнике. */
export const needsSuppUpgrade = (d: FormaData) => !!d.seedRev && d.suppRev !== SUPP_REV;

export const upgradeSupps = (d: FormaData): FormaData =>
  ({ ...d, supplements: SUPPS_2026_10_11, suppRules: RULES_2026_10_11, suppRev: SUPP_REV });
