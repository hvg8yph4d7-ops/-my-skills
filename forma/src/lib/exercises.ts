// Упражнения: единые названия (синонимы), разбор старых строк тренировок из чата и прогресс по каждому упражнению.
// Источник правды — day.exercises; вкладка «Прогресс» ничего не хранит отдельно, а собирает историю из дней.

import type { Exercise, ExSet, FormaData } from '../types';

export type Alias = { group: string; name: string; alts: string[]; bodyweight?: boolean };

/** Жим лёжа — отдельно: для него «цель» (жим до перерыва) и карточка на «Обзоре». */
export const BENCH = 'Жим штанги лёжа';

/** Синонимы по умолчанию. Группа важна: «жим гантелей» в день груди и в день плеч — разные упражнения. */
export const DEFAULT_ALIASES: Alias[] = [
  { group: 'грудь', name: BENCH, alts: ['жим', 'жим лежа', 'жим штанги', 'жим штанги лежа', 'жим лежа штанги', 'жим штанги на горизонтальной скамье'] },
  { group: 'грудь', name: 'Жим гантелей лёжа', alts: ['жим гантелей', 'жим гантелей лежа'] },
  { group: 'грудь', name: 'Жим гантелей на наклонной', alts: ['жим гантелей на наклонной скамье', 'жим гантелей на наклонной скамье под 45°', 'жим гантелей на наклонной скамье под 45', 'жим гантелей под углом', 'жим гантелей на наклонной'] },
  { group: 'грудь', name: 'Хаммер на грудь', alts: ['хаммер на грудь', 'хаммер'] },
  { group: 'грудь', name: 'Бабочка', alts: ['бабочка', 'сведения в бабочке', 'пек-дек'] },
  { group: 'плечи', name: 'Жим гантелей сидя на плечи', alts: ['жим гантелей', 'жим гантелей сидя', 'жим гантелей на плечи', 'жим гантелей сидя на плечи'] },
  { group: 'плечи', name: 'Махи в стороны', alts: ['махи в стороны', 'махи гантелями в стороны', 'махи на среднюю дельту', 'махи со свободным весом', 'махи стоя', 'махи гантелями'] },
  { group: 'плечи', name: 'Махи в тренажёре', alts: ['махи в тренажере'] },
  { group: 'плечи', name: 'Махи на переднюю дельту', alts: ['махи гантелями поочередно на переднюю дельту', 'махи на переднюю дельту'] },
  { group: 'плечи', name: 'Протяжка в кроссовере', alts: ['протяжка', 'протяжка в кроссовере'] },
  { group: 'плечи', name: 'Протяжка с гантелями', alts: ['протяжка с гантелями'] },
  { group: 'плечи', name: 'Задняя дельта в бабочке', alts: ['задняя дельта в бабочке', 'задняя дельта'] },
  { group: 'спина', name: 'Вертикальная тяга', alts: ['вертикальная тяга', 'тяга верхнего блока'] },
  { group: 'спина', name: 'Хаммер (тяга)', alts: ['хаммер'] },
  { group: 'спина', name: 'Пуловер', alts: ['пуловер'] },
  { group: 'спина', name: 'Подтягивания', alts: ['подтягивания', 'подтягивания на турнике'], bodyweight: true },
  { group: 'спина', name: 'Тяга штанги в наклоне', alts: ['тяга штанги в наклоне'] },
  { group: 'спина', name: 'Горизонтальная тяга', alts: ['горизонтальная тяга', 'тяга нижнего блока'] },
  { group: 'спина', name: 'Тяга в наклоне в тренажёре', alts: ['тяга в наклоне в тренажере'] },
  { group: 'спина', name: 'Тяга лёжа с упором грудью', alts: ['тяга лежа на тренажере с упором грудью', 'тяга с упором грудью', 'тяга лежа с упором грудью'] },
  { group: 'спина', name: 'Тяга гантели одной рукой', alts: ['тяга гантели одной рукой', 'тяга гантели в наклоне'] },
  { group: 'бицепс', name: 'Молотки', alts: ['молотки', 'молот'] },
  { group: 'бицепс', name: 'Сгибания с супинацией', alts: ['сгибания с супинацией'] },
  { group: 'бицепс', name: 'Сгибания в кроссовере', alts: ['сгибания в кроссовере'] },
  { group: 'бицепс', name: 'Сгибания на скамье Скотта', alts: ['сгибания на скамье скотта', 'скотт'] },
  { group: 'бицепс', name: 'Подъём штанги на бицепс', alts: ['подъем штанги на бицепс', 'подъем штанги'] },
  { group: 'трицепс', name: 'Разгибания в кроссовере', alts: ['разгибания в кроссовере', 'разгибания на трицепс в кроссовере'] },
  { group: 'трицепс', name: 'Разгибания с канатом', alts: ['разгибания с канатом в кроссовере', 'разгибания с канатом'] },
  { group: 'трицепс', name: 'Разгибания одной рукой в кроссовере', alts: ['разгибания одной рукой в кроссовере'] },
  { group: 'трицепс', name: 'Французский жим', alts: ['французский жим', 'жим французским хватом', 'французский жим лежа', 'французский жим со штангой', 'французский жим с ez-грифом'] },
  { group: 'трицепс', name: 'Жим гантели из-за головы', alts: ['жим гантели из-за головы', 'французский жим гантели'] },
  { group: 'трицепс', name: 'Отжимания на брусьях', alts: ['брусья', 'отжимания на брусьях'], bodyweight: true },
  { group: 'ноги', name: 'Разгибания ног', alts: ['разгибания', 'разгибания в тренажере', 'разгибания ног'] },
  { group: 'ноги', name: 'Сгибания ног', alts: ['сгибания сидя', 'сгибания в тренажере', 'сгибания ног', 'сгибания'] },
  { group: 'ноги', name: 'Жим ногами', alts: ['жим ногами'] },
  { group: 'ноги', name: 'Икры', alts: ['икры', 'подъемы на носки'] },
  { group: 'ноги', name: 'Приседания', alts: ['приседания', 'присед'] },
];

const GROUP_WORDS: Record<string, string> = { грудь: 'грудь', спина: 'спина', ноги: 'ноги', плечи: 'плечи', бицепс: 'бицепс', трицепс: 'трицепс' };

export const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').replace(/[.;]+$/, '').trim();
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const aliasesOf = (d: FormaData): Alias[] => d.exerciseAliases ?? DEFAULT_ALIASES;

/** «Плечи: махи стоя» → { group: 'плечи', rest: 'махи стоя' }. */
function splitPrefix(name: string): { group: string | null; rest: string } {
  const m = name.match(/^\s*([А-Яа-яЁё]+)\s*:\s*(.*)$/);
  const g = m && GROUP_WORDS[norm(m[1])];
  return g ? { group: g, rest: m![2] } : { group: null, rest: name };
}

/** Единое название и группа упражнения. groups — группы дня: помогают, если в названии группы нет. */
export function canon(aliases: Alias[], rawName: string, group: string | null, dayGroups: string[] = []) {
  const p = splitPrefix(rawName);
  const g = group || p.group;
  const n = norm(p.rest).replace(/\s*—\s*замер$/, '');
  const hit = (a: Alias) => norm(a.name) === n || a.alts.some(x => norm(x) === n);
  const found = (g && aliases.find(a => a.group === g && hit(a)))
    || (!g && aliases.find(a => dayGroups.includes(a.group) && hit(a)))
    || (!g && aliases.find(hit));
  if (found) return { name: found.name, group: found.group, bodyweight: !!found.bodyweight };
  const fallbackGroup = g || (dayGroups.length === 1 ? dayGroups[0] : null);
  return { name: n ? cap(p.rest.trim().replace(/\s*—\s*замер$/i, '')) : 'Без названия', group: fallbackGroup, bodyweight: false };
}

// ---- Разбор старой строки тренировки из чата ----

const NOTE_RE = /(болел|болит|заболел|не пошло|пропустил)/i;

/** Подходы из текста: «70 кг × 5, 60 кг × 10», «60 кг × 12, 3 подхода», «20 кг × 10-12», «сет 12 → 8 кг». */
export function parseSets(text: string): ExSet[] {
  const sets: ExSet[] = [];
  for (const part of text.split(/,\s*/)) {
    const drop = part.match(/(?:дроп-?)?сет\s*(\d+(?:[.,]\d+)?)\s*(?:→|->|-)\s*(\d+(?:[.,]\d+)?)\s*кг/i);
    if (drop) {
      sets.push({ weight: +drop[1].replace(',', '.'), reps: null, note: 'дроп-сет' }, { weight: +drop[2].replace(',', '.'), reps: null, note: 'дроп-сет' });
      continue;
    }
    const wr = part.match(/(\d+(?:[.,]\d+)?)\s*кг\s*[×xх*]\s*(\d+)(?:\s*[-–]\s*(\d+))?/i);
    if (wr) {
      sets.push({ weight: +wr[1].replace(',', '.'), reps: +wr[2], ...(wr[3] ? { repsMax: +wr[3] } : {}) });
      continue;
    }
    const n = part.match(/(\d+)\s*подход/i);
    if (n && sets.length) {
      const last = sets[sets.length - 1];
      for (let i = 1; i < +n[1]; i++) sets.push({ ...last });
      continue;
    }
    const r = part.match(/(\d+)(?:\s*[-–]\s*(\d+))?\s*повт/i);
    if (r) sets.push({ weight: null, reps: +r[1], ...(r[2] ? { repsMax: +r[2] } : {}) });
  }
  return sets;
}

/**
 * Строка тренировки из чата → упражнения (или null, если это заметка, а не упражнение).
 * Исходная строка сохраняется в src — ничего не теряется.
 */
export function parseTrainingLine(line: string, dayGroups: string[], aliases: Alias[] = DEFAULT_ALIASES): Exercise[] | null {
  if (NOTE_RE.test(line)) return null;
  const ss = line.match(/^\s*суперсет\s*:\s*(.+)$/i);
  if (ss) {
    return ss[1].split(/\s*\+\s*/).flatMap(part => (parseTrainingLine(part, dayGroups, aliases) || []).map(e => ({ ...e, note: 'суперсет', src: line })));
  }
  const { group, rest } = splitPrefix(line);
  // Имя и подходы: разделитель — «:», «—», «-» или «,» перед цифрой или словом «сет».
  const m = rest.match(/^(.*?)(?:\s*[—:–-]\s*|,\s*)(?=(?:дроп-?)?сет\s*\d|\d)(.*)$/i);
  const names = m ? [m[1]] : rest.split(/,\s*/);
  const sets = m ? parseSets(m[2]) : [];
  return names.filter(n => n.trim()).map(n => {
    const c = canon(aliases, n, group, dayGroups);
    return { name: c.name, group: c.group, sets: names.length === 1 ? sets : [], src: line };
  });
}

// ---- Подходы и расчёты ----

/** Расчётный максимум по Эпли; для диапазона — нижняя граница. null, если веса или повторов нет. */
export const e1rmSet = (s: ExSet) => (s.weight != null && s.reps != null ? Math.round(s.weight * (1 + s.reps / 30) * 10) / 10 : null);

const repsTxt = (s: ExSet) => (s.reps == null ? '' : s.repsMax ? `${s.reps}–${s.repsMax}` : String(s.reps));
const w = (n: number) => String(n).replace('.', ',');

/** «70×5, 60×10», «60×12 (3 подхода)», «12 → 8 кг (дроп-сет)», «10 повт.», «вес не записан». */
export function setsText(sets: ExSet[]): string {
  if (!sets.length) return '';
  if (sets.every(s => s.note === 'дроп-сет' && s.reps == null)) return sets.map(s => w(s.weight!)).join(' → ') + ' кг (дроп-сет)';
  const parts: string[] = [];
  for (let i = 0; i < sets.length;) {
    const s = sets[i];
    let n = 1;
    while (i + n < sets.length && JSON.stringify(sets[i + n]) === JSON.stringify(s)) n++;
    const one = s.weight != null ? `${w(s.weight)}×${repsTxt(s) || '?'}` : `${repsTxt(s)} повт.`;
    parts.push(n > 1 ? `${one} (${n} подх.)` : one);
    i += n;
  }
  return parts.join(', ');
}

/** Все подходы жима штанги лёжа — замена старого списка bench. */
export function benchSets(d: FormaData): { date: string; w: number; r: number }[] {
  const al = aliasesOf(d);
  const out: { date: string; w: number; r: number }[] = [];
  for (const day of d.days.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    for (const x of day.exercises || []) {
      if (canon(al, x.name, x.group, day.groups).name !== BENCH) continue;
      for (const s of x.sets) if (s.weight != null && s.reps != null) out.push({ date: day.date, w: s.weight, r: s.reps });
    }
  }
  return out;
}

// ---- Прогресс ----

export type Session = { date: string; sets: ExSet[]; metric: number | null };
export type Progress = {
  key: string; name: string; group: string | null; bodyweight: boolean;
  /** Чем меряем: расчётный максимум, повторы (свой вес) или просто вес (повторы не записаны). */
  by: 'e1rm' | 'reps' | 'weight' | null;
  sessions: Session[]; best: Session | null; last: Session; trend: '↑' | '↓' | '=' | null;
};

function metricOf(sets: ExSet[], by: Progress['by']): number | null {
  const vals = sets.map(s => (by === 'e1rm' ? e1rmSet(s) : by === 'reps' ? s.reps : by === 'weight' ? s.weight : null)).filter((v): v is number => v != null);
  return vals.length ? Math.max(...vals) : null;
}

/** Все упражнения, которые когда-либо делались, с историей, рекордом и сравнением с прошлым разом. */
export function progressList(d: FormaData): Progress[] {
  const al = aliasesOf(d);
  const map = new Map<string, { name: string; group: string | null; bodyweight: boolean; sessions: { date: string; sets: ExSet[] }[] }>();
  for (const day of d.days.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    for (const x of day.exercises || []) {
      const c = canon(al, x.name, x.group, day.groups);
      const key = (c.group || '—') + '|' + c.name;
      const e = map.get(key) || { name: c.name, group: c.group, bodyweight: c.bodyweight, sessions: [] };
      const same = e.sessions.find(s => s.date === day.date);
      if (same) same.sets.push(...x.sets); else e.sessions.push({ date: day.date, sets: [...x.sets] });
      map.set(key, e);
    }
  }
  return [...map.entries()].map(([key, e]) => {
    const all = e.sessions.flatMap(s => s.sets);
    const by: Progress['by'] = all.some(s => e1rmSet(s) != null) && !e.bodyweight ? 'e1rm'
      : all.some(s => s.weight == null && s.reps != null) ? 'reps'
        : all.some(s => s.weight != null) ? 'weight' : null;
    const sessions = e.sessions.map(s => ({ ...s, metric: metricOf(s.sets, by) }));
    const withM = sessions.filter(s => s.metric != null);
    const best = withM.reduce<Session | null>((m, s) => (!m || s.metric! > m.metric! ? s : m), null);
    const last = sessions[sessions.length - 1];
    const prev = withM.filter(s => s !== last).pop();
    const trend = last.metric == null || !prev ? null : last.metric > prev.metric! ? '↑' : last.metric < prev.metric! ? '↓' : '=';
    return { key, name: e.name, group: e.group, bodyweight: e.bodyweight, by, sessions, best, last, trend };
  });
}

// ---- Редактор синонимов: «группа | Название* = вариант, вариант» (* — упражнение с собственным весом) ----

export const aliasesToText = (list: Alias[]) =>
  list.map(a => `${a.group} | ${a.name}${a.bodyweight ? '*' : ''} = ${a.alts.join(', ')}`).join('\n');

export function textToAliases(text: string): Alias[] {
  const out: Alias[] = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    const m = line.match(/^\s*([^|]+?)\s*\|\s*([^=]+?)\s*(?:=\s*(.*))?$/);
    const g = m && GROUP_WORDS[norm(m[1])];
    if (!m || !g) throw new Error(`строка ${i + 1}: нужно «группа | Название = варианты», группа — грудь, спина, ноги, плечи, бицепс или трицепс`);
    const bodyweight = m[2].endsWith('*');
    out.push({ group: g, name: m[2].replace(/\*$/, '').trim(), alts: (m[3] || '').split(',').map(s => norm(s)).filter(Boolean), ...(bodyweight ? { bodyweight } : {}) });
  });
  return out;
}
