// Даты и числа — те же правила, что в старом трекере.

export const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const WDF = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
export const M = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
export const dk = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const todayKey = () => {
  const t = new Date();
  return dk(t.getFullYear(), t.getMonth(), t.getDate());
};

const parts = (k: string) => k.split('-').map(Number);
const toDate = (k: string) => { const p = parts(k); return new Date(p[0], p[1] - 1, p[2]); };

export const num = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
export const shortD = (k: string) => { const p = parts(k); return p[2] + ' ' + M[p[1] - 1].slice(0, 3) + '.'; };
export const longD = (k: string) => { const p = parts(k); return p[2] + ' ' + M[p[1] - 1]; };
/** Индекс дня недели, Пн = 0. */
export const wdIndex = (k: string) => (toDate(k).getDay() + 6) % 7;
export const wdName = (k: string) => WDF[wdIndex(k)];
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);

/** 1 день, 2 дня, 5 дней. */
export function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}
