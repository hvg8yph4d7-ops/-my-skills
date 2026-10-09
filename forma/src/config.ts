// Онлайн-аккаунты (Supabase). Адрес проекта и публичный ключ (publishable) — их можно хранить в коде:
// доступ к данным защищён правилами из supabase/schema.sql. Секретный ключ (sb_secret_… / service_role) сюда НЕ класть.
// Пустые значения — приложение работает только на телефоне, без аккаунтов.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? 'https://iapnmnihusdvqmqysnxu.supabase.co';
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_9-G5FJp3RAp0vAltbbV2pg_c4evmD4L';
