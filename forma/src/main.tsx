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

// Офлайн-режим и автообновление приложения.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
