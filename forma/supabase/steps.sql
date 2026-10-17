-- «Форма»: шаги из Apple Health (17.10.2026).
-- Вставить целиком в Supabase → SQL Editor → Run. Нужен уже выполненный supabase/sleep.sql (токен общий).
--
-- «Команды» шлют шаги, сгруппированные по дням («Найти данные Здоровья» → Шаги → «Группировать по: День»):
--   POST https://<проект>.supabase.co/rest/v1/rpc/add_steps_days
--   { "p_token": "...", "p_dates": "даты начала дня через перенос строки (ISO 8601)", "p_values": "шаги через перенос строки" }
-- Каждый день перезаписывается — сегодняшний неполный день потом обновится.

create table if not exists public.steps (
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  steps      int  not null check (steps between 0 and 300000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
alter table public.steps enable row level security;
drop policy if exists "steps read" on public.steps;
create policy "steps read" on public.steps for select
  using (auth.uid() = user_id or public.is_coach_of(user_id));

create or replace function public.add_steps_days(p_token text, p_dates text, p_values text)
returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := public.sleep_user(p_token);
  d text[]; v text[]; i int; n int := 0; num text; cnt int; day date; out text := '';
begin
  if uid is null then raise exception 'Неверный токен — создай новый в приложении: ⚙ → Сон из Здоровья'; end if;
  d := string_to_array(btrim(coalesce(p_dates, ''), E' \n\r'), E'\n');
  v := string_to_array(btrim(coalesce(p_values, ''), E' \n\r'), E'\n');
  if coalesce(array_length(d, 1), 0) = 0 or d[1] = '' then raise exception 'Нет данных о шагах'; end if;
  if array_length(d, 1) <> coalesce(array_length(v, 1), 0) then
    raise exception 'Разное число дат (%) и значений (%)', array_length(d, 1), array_length(v, 1);
  end if;
  for i in 1 .. array_length(d, 1) loop
    -- «8 432», «8432,0», «8,432.0» → 8432
    num := regexp_replace(v[i], '[^0-9.,]', '', 'g');
    if num like '%,%' and num like '%.%' then num := replace(num, ',', ''); else num := replace(num, ',', '.'); end if;
    if num = '' then continue; end if;
    cnt := round(num::numeric)::int;
    day := left(btrim(d[i], E' \r'), 10)::date;
    insert into public.steps (user_id, date, steps) values (uid, day, cnt)
    on conflict (user_id, date) do update set steps = excluded.steps, updated_at = now();
    n := n + 1;
    out := out || format('%s: %s', to_char(day, 'DD.MM'), cnt) || '; ';
  end loop;
  return format('Шаги записаны (%s дн.): %s', n, rtrim(out, '; '));
end $$;
revoke all on function public.add_steps_days(text, text, text) from public;
grant execute on function public.add_steps_days(text, text, text) to anon, authenticated;
