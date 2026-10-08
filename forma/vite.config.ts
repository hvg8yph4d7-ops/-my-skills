import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Сайт живёт по адресу https://<логин>.github.io/-my-skills/ — отсюда base.
export default defineConfig({
  base: '/-my-skills/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Форма',
        short_name: 'Форма',
        description: 'Трекер зала, еды и добавок',
        lang: 'ru',
        start_url: '.',
        display: 'standalone',
        background_color: '#0d1b2a',
        theme_color: '#0d1b2a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg}', 'assets/*-{latin,cyrillic}-*.woff2'] },
    }),
  ],
});
