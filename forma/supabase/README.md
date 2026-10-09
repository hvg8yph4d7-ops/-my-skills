# Настройка онлайн-аккаунтов (Supabase)

1. Зайти на https://supabase.com → **Start your project** → войти через GitHub.
2. **New project**: имя `forma`, придумать пароль базы (сохранить себе), регион — **Central EU (Frankfurt)**. Тариф Free.
3. Подождать 1–2 минуты, пока проект создаётся.
4. Слева **SQL Editor** → **New query** → вставить весь файл `schema.sql` → **Run**. Должно быть «Success».
5. Слева **Authentication** → **Sign In / Providers** → **Email**: выключить **Confirm email** → Save
   (иначе после регистрации нужно подтверждать почту по ссылке из письма).
6. **Project Settings** (шестерёнка) → **API** (или **Data API** / **API Keys**): скопировать
   - **Project URL** — вида `https://abcd1234.supabase.co`
   - **Publishable key** (или **anon public**) — длинная строка.
   Секретный ключ (**secret** / **service_role**) никому не давать и в код не класть.
7. Вписать оба значения в `src/config.ts` (или передать Claude) и опубликовать.
