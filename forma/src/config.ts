// Онлайн-аккаунты (Supabase). Адрес проекта и публичный ключ (publishable / anon) — их можно хранить в коде:
// доступ к данным защищён правилами из supabase/schema.sql. Секретный ключ (service_role) сюда НЕ класть.
// Пока пусто — приложение работает только на телефоне, без аккаунтов.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY || '';
