// Журнал ошибок для кнопки «Сообщить об ошибке». Хранится в localStorage, ключи API туда не попадают.

declare const __BUILD__: string;
export const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

type Logged = { at: string; msg: string };
const KEY = 'forma-errors';

function read(): Logged[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function logError(msg: string) {
  try {
    const clean = msg.replace(/AIza[\w-]+|AQ\.[\w.-]+|sk-ant-[\w-]+/g, '[ключ скрыт]').slice(0, 400);
    localStorage.setItem(KEY, JSON.stringify([...read(), { at: new Date().toISOString(), msg: clean }].slice(-15)));
  } catch { /* хранилище недоступно — не страшно */ }
}

export function installErrorLog() {
  window.addEventListener('error', e => logError('JS: ' + (e.message || String(e.error))));
  window.addEventListener('unhandledrejection', e => logError('Promise: ' + String((e.reason as Error)?.message || e.reason)));
}

/** Текст отчёта: версия, телефон, настройки ИИ (без ключа), объём данных, последние ошибки. */
export function bugReport(info: { provider: string; model: string; hasKey: boolean; who: string; days: number; what: string }) {
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
  const errs = read().map(e => `${e.at.slice(5, 16).replace('T', ' ')} — ${e.msg}`).join('\n') || 'нет';
  return [
    '🐞 Ошибка в «Форме»',
    `Что случилось: ${info.what || '(не описано)'}`,
    '',
    `Кто: ${info.who} · дней в дневнике: ${info.days}`,
    `Версия: ${BUILD}`,
    `Запуск: ${standalone ? 'с иконки' : 'в браузере'} · ${navigator.userAgent}`,
    `ИИ: ${info.provider} · ${info.model || 'модель не выбрана'} · ключ ${info.hasKey ? 'есть' : 'нет'}`,
    'Последние ошибки:',
    errs,
  ].join('\n');
}

export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  try { if (navigator.share) { await navigator.share({ text }); return 'shared'; } } catch (e) { if ((e as Error).name === 'AbortError') return 'failed'; }
  try { await navigator.clipboard.writeText(text); return 'copied'; } catch { return 'failed'; }
}
