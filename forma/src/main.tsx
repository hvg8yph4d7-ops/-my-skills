import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/oswald/latin-500.css';
import '@fontsource/oswald/cyrillic-500.css';
import '@fontsource/oswald/latin-600.css';
import '@fontsource/oswald/cyrillic-600.css';
import '@fontsource/oswald/latin-700.css';
import '@fontsource/oswald/cyrillic-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/cyrillic-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/cyrillic-700.css';
import './styles.css';
import { App } from './App';
import { installErrorLog } from './lib/bugs';

// Офлайн-режим и автообновление приложения.
registerSW({ immediate: true });

// После обновления сайта старая версия на телефоне может не найти кусок кода
// («Importing a module script failed»). Тогда перезагружаемся на свежую версию — не чаще раза в минуту.
window.addEventListener('vite:preloadError', e => {
  try {
    const last = Number(sessionStorage.getItem('forma-reload') || 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem('forma-reload', String(Date.now()));
  } catch { /* без sessionStorage просто перезагружаемся */ }
  e.preventDefault();
  location.reload();
});
installErrorLog();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
