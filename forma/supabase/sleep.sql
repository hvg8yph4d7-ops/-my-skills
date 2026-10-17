-- «Форма»: сон из Apple Health (17.10.2026).
-- Вставить целиком в Supabase → SQL Editor → Run. Повторный запуск безопасен.
-- Нужна уже выполненная основная схема (supabase/schema.sql) — отсюда используется is_coach_of.
--
-- Как это работает:
--   • в приложении (⚙ → «Сон из Здоровья») создаётся секретный токен; в базе хранится только его хэш;
--   • «Команды» на iPhone каждое утро шлют сон на адрес
--       POST https://<проект>.supabase.co/rest/v1/rpc/add_sleep_samples   (образцы из «Здоровья»)
--       POST https://<проект>.supabase.co/rest/v1/rpc/add_sleep           (готовые цифры: дата, отбой, подъём, часы)
--     с заголовком apikey (публичный ключ) и токеном в теле запроса;
--   • приложение при открытии забирает новые записи из таблицы sleep и кладёт их в нужный день.

create extension if not exists pgcrypto with schema extensions;

-- Сон: одна запись на пользователя и день. День = дата подъёма (ночь 16→17 относится к 17-му).
create table if not exists public.sleep (
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  bed        text,                 -- время отбоя, 'ЧЧ:ММ'
  wake       text,                 -- время подъёма, 'ЧЧ:ММ'
  minutes    int  not null check (minutes between 1 and 1440),
  source     text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.sleep enable row level security;
drop policy if exists "sleep read" on public.sleep;
create policy "sleep read" on public.sleep for select
  using (auth.uid() = user_id or public.is_coach_of(user_id));
-- Писать в sleep напрямую нельзя никому — только через функции ниже.

-- Секретные токены «Команд». Хранится только sha256-хэш; таблицу читают только функции.
create table if not exists public.sleep_tokens (
  user_id    uuid primary key references auth.users on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now()
);
alter table public.sleep_tokens enable row level security;

-- Задать (или заменить) свой токен. Вызывает приложение, когда пользователь вошёл в аккаунт.
create or replace function public.set_sleep_token(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then raise exception 'Нужно войти в аккаунт'; end if;
  if length(coalesce(p_token, '')) < 32 then raise exception 'Слишком короткий токен'; end if;
  insert into public.sleep_tokens (user_id, token_hash)
  values (auth.uid(), encode(extensions.digest(p_token, 'sha256'), 'hex'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now();
end $$;
revoke all on function public.set_sleep_token(text) from public, anon;
grant execute on function public.set_sleep_token(text) to authenticated;

-- Чей это токен. Только для функций ниже.
create or replace function public.sleep_user(p_token text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select user_id from public.sleep_tokens
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;
revoke all on function public.sleep_user(text) from public, anon, authenticated;

create or replace function public.sleep_save(uid uuid, d date, b text, w text, m int, src text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if m is null or m < 1 or m > 1440 then raise exception 'Странная длительность сна: % мин', m; end if;
  insert into public.sleep (user_id, date, bed, wake, minutes, source)
  values (uid, d, b, w, m, src)
  on conflict (user_id, date) do update
    set bed = excluded.bed, wake = excluded.wake, minutes = excluded.minutes, source = excluded.source, updated_at = now();
  return format('Записано: %s — %s ч %s мин (%s–%s)', to_char(d, 'DD.MM'), m / 60, m % 60, coalesce(b, '?'), coalesce(w, '?'));
end $$;
revoke all on function public.sleep_save(uuid, date, text, text, int, text) from public, anon, authenticated;

-- Вариант 1: готовые цифры. p_date — дата подъёма, p_bed/p_wake — 'ЧЧ:ММ', p_hours — сколько спал (например 7.33).
create or replace function public.add_sleep(p_token text, p_date date, p_hours numeric, p_bed text default null, p_wake text default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := public.sleep_user(p_token);
begin
  if uid is null then raise exception 'Неверный токен — создай новый в приложении: ⚙ → Сон из Здоровья'; end if;
  return public.sleep_save(uid, p_date, left(p_bed, 5), left(p_wake, 5), round(p_hours * 60)::int, 'manual');
end $$;
revoke all on function public.add_sleep(text, date, numeric, text, text) from public;
grant execute on function public.add_sleep(text, date, numeric, text, text) to anon, authenticated;

-- Вариант 2: сырые образцы из «Здоровья» («Анализ сна»). Списки через перенос строки, даты в ISO 8601
-- (например 2026-10-17T07:12:00+05:00). Считает сам: берёт последнюю ночь (16 ч до самого позднего подъёма),
-- склеивает пересечения (часы + телефон пишут одно и то же), не считает «В кровати» и «Бодрствование».
create or replace function public.add_sleep_samples(p_token text, p_starts text, p_ends text, p_values text default '')
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.sleep_user(p_token);
  s text[]; e text[]; v text[];
  mins numeric; bed_txt text; wake_txt text;
begin
  if uid is null then raise exception 'Неверный токен — создай новый в приложении: ⚙ → Сон из Здоровья'; end if;
  s := string_to_array(btrim(coalesce(p_starts, ''), E' \n\r'), E'\n');
  e := string_to_array(btrim(coalesce(p_ends, ''), E' \n\r'), E'\n');
  v := string_to_array(coalesce(p_values, ''), E'\n');
  if coalesce(array_length(s, 1), 0) = 0 or s[1] = '' then
    raise exception 'Нет данных о сне за эту ночь — проверь, что «Здоровье» записало сон';
  end if;
  if array_length(s, 1) <> coalesce(array_length(e, 1), 0) then
    raise exception 'Разное число начал (%) и концов (%) сна', array_length(s, 1), array_length(e, 1);
  end if;

  with raw as (
    select btrim(a.st, E' \r') st_txt, btrim(a.en, E' \r') en_txt, coalesce(btrim(a.val, E' \r'), '') val
    from unnest(s, e, v) as a(st, en, val)
    where coalesce(btrim(a.st, E' \r'), '') <> '' and coalesce(btrim(a.en, E' \r'), '') <> ''
  ), typed as (
    select st_txt, en_txt, val, st_txt::timestamptz st, en_txt::timestamptz en from raw
  ), win as (
    select * from typed where en > (select max(en) from typed) - interval '16 hours'
  ), asleep as (
    select * from win where val !~* '(bed|кроват|awake|бодрств|просып|проснул)'
  ), used as (
    select st, en from asleep
    union all
    select st, en from win where not exists (select 1 from asleep)  -- только «В кровати» (без часов) — считаем его
  ), ord as (
    select st, en, max(en) over (order by st, en rows between unbounded preceding and 1 preceding) prev_max from used
  ), grp as (
    select st, en, sum(case when prev_max is null or st > prev_max then 1 else 0 end) over (order by st, en) g from ord
  ), merged as (
    select min(st) st, max(en) en from grp group by g
  )
  select extract(epoch from sum(en - st)) / 60,
         (select st_txt from win order by st limit 1),
         (select en_txt from win order by en desc limit 1)
    into mins, bed_txt, wake_txt
  from merged;

  return public.sleep_save(uid, left(wake_txt, 10)::date, substr(bed_txt, 12, 5), substr(wake_txt, 12, 5), round(mins)::int, 'health');
end $$;
revoke all on function public.add_sleep_samples(text, text, text, text) from public;
grant execute on function public.add_sleep_samples(text, text, text, text) to anon, authenticated;
