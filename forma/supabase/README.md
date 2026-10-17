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

## Сон из Apple Health (17.10.2026)

Выполнить один раз `supabase/sleep.sql` в SQL Editor (после основной схемы). Создаёт таблицы `sleep` и `sleep_tokens` и функции:
`set_sleep_token` (приложение, вошедший пользователь), `add_sleep_samples` и `add_sleep` (для «Команд» на iPhone, по секретному токену).
Адрес для «Команд»: `https://<проект>.supabase.co/rest/v1/rpc/add_sleep_samples`, заголовок `apikey: <публичный ключ>`, тело — JSON
`{ "p_token", "p_starts", "p_ends", "p_values" }` (списки через перенос строки, даты ISO 8601).

## Шаги из Apple Health (17.10.2026)

Выполнить `supabase/steps.sql` (после `sleep.sql`, токен общий). Функция `add_steps_days(p_token, p_dates, p_values)`: шаги по дням
(«Найти данные Здоровья» → Шаги → «Группировать по: День»), даты ISO 8601 через перенос строки; каждый день перезаписывается.
