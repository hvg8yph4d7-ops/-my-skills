-- «Форма»: онлайн-аккаунты и доступ тренера.
-- Вставить целиком в Supabase → SQL Editor → Run. Повторный запуск безопасен.

-- Дневник: одна строка на пользователя, всё содержимое — в data (тот же JSON, что в резервной копии).
create table if not exists public.diaries (
  user_id    uuid primary key references auth.users on delete cascade,
  email      text,
  name       text,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- Кому пользователь дал доступ к своему дневнику (по почте тренера).
create table if not exists public.coaches (
  owner_id    uuid not null references auth.users on delete cascade,
  coach_email text not null,
  created_at  timestamptz not null default now(),
  primary key (owner_id, coach_email)
);

alter table public.diaries enable row level security;
alter table public.coaches enable row level security;

-- Является ли текущий пользователь тренером владельца дневника.
create or replace function public.is_coach_of(owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coaches c
    where c.owner_id = owner and lower(c.coach_email) = lower(auth.jwt() ->> 'email')
  );
$$;

drop policy if exists "diary read" on public.diaries;
drop policy if exists "diary insert" on public.diaries;
drop policy if exists "diary update" on public.diaries;
create policy "diary read" on public.diaries for select
  using (auth.uid() = user_id or public.is_coach_of(user_id));
create policy "diary insert" on public.diaries for insert
  with check (auth.uid() = user_id);
create policy "diary update" on public.diaries for update
  using (auth.uid() = user_id or public.is_coach_of(user_id))
  with check (auth.uid() = user_id or public.is_coach_of(user_id));

drop policy if exists "owner manages coaches" on public.coaches;
drop policy if exists "coach sees links" on public.coaches;
create policy "owner manages coaches" on public.coaches for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "coach sees links" on public.coaches for select
  using (lower(coach_email) = lower(auth.jwt() ->> 'email'));
