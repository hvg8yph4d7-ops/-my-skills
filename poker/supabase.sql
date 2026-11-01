-- «Покерная лига»: игроки, вход по номеру телефона + PIN, вечера и настройки.
-- Вставить целиком в Supabase → SQL Editor → Run. Повторный запуск безопасен.
-- ВАЖНО: в самом конце файла замените номер 79990000000 на свой — так вы станете первым админом.
--
-- Сайт ходит в базу только через функции poker_* ниже. Таблицы закрыты (RLS без политик),
-- поэтому телефоны и PIN-коды наружу не попадают: PIN хранится только в виде хэша bcrypt.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.poker_players (
  id           text primary key,
  name         text not null,
  phone        text unique,                  -- только цифры, формат 7XXXXXXXXXX
  pin_hash     text,                         -- null = игрок ещё не заходил, PIN задаст при первом входе
  is_admin     boolean not null default false,
  failed       int not null default 0,       -- неудачные попытки PIN подряд
  locked_until timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.poker_sessions (
  token      uuid primary key default gen_random_uuid(),
  player_id  text not null references public.poker_players on delete cascade,
  created_at timestamptz not null default now()
);

-- Вечер целиком лежит в data (тот же формат, что у страницы): дата, взнос, игроки, порядок вылета…
create table if not exists public.poker_games (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Фото последней раздачи отдельно, чтобы не тянуть картинки при каждой загрузке.
create table if not exists public.poker_photos (
  game_id text primary key references public.poker_games on delete cascade,
  data    text not null
);

create table if not exists public.poker_settings (
  id   int primary key default 1 check (id = 1),
  data jsonb not null
);

alter table public.poker_players  enable row level security;
alter table public.poker_sessions enable row level security;
alter table public.poker_games    enable row level security;
alter table public.poker_photos   enable row level security;
alter table public.poker_settings enable row level security;

-- ---------- служебные ----------

create or replace function public.poker_norm_phone(p text) returns text
language plpgsql immutable set search_path = public as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if length(d) = 11 and left(d, 1) = '8' then d := '7' || substr(d, 2); end if;
  if length(d) = 10 then d := '7' || d; end if;
  if length(d) < 10 or length(d) > 15 then raise exception 'Проверьте номер телефона'; end if;
  return d;
end $$;

-- Кто вошёл по токену; ошибка, если токен недействителен.
create or replace function public.poker_auth(p_token uuid) returns public.poker_players
language plpgsql stable security definer set search_path = public as $$
declare r public.poker_players;
begin
  select p.* into r from public.poker_sessions s join public.poker_players p on p.id = s.player_id
   where s.token = p_token;
  if not found then raise exception 'Сессия устарела, войдите заново' using errcode = '28000'; end if;
  return r;
end $$;

create or replace function public.poker_admin(p_token uuid) returns public.poker_players
language plpgsql stable security definer set search_path = public as $$
declare r public.poker_players := public.poker_auth(p_token);
begin
  if not r.is_admin then raise exception 'Это может делать только админ лиги' using errcode = '42501'; end if;
  return r;
end $$;

-- ---------- чтение (доступно всем, у кого есть ссылка) ----------

create or replace function public.poker_state() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'players',  coalesce((select jsonb_object_agg(id, jsonb_build_object('name', name, 'isAdmin', is_admin,
                  'registered', pin_hash is not null, 'createdAt', extract(epoch from created_at) * 1000))
                  from public.poker_players), '{}'::jsonb),
    'games',    coalesce((select jsonb_object_agg(g.id, g.data || jsonb_build_object('hasPhoto', ph.game_id is not null))
                  from public.poker_games g left join public.poker_photos ph on ph.game_id = g.id), '{}'::jsonb),
    'settings', coalesce((select data from public.poker_settings where id = 1), '{}'::jsonb)
  );
$$;

create or replace function public.poker_photo(p_game text) returns text
language sql stable security definer set search_path = public as $$
  select data from public.poker_photos where game_id = p_game;
$$;

-- ---------- вход ----------

create or replace function public.poker_login(p_phone text, p_pin text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ph text := public.poker_norm_phone(p_phone);
  r public.poker_players;
  first_time boolean := false;
  t uuid;
begin
  if p_pin !~ '^\d{4}$' then raise exception 'PIN — это 4 цифры'; end if;
  select * into r from public.poker_players where phone = ph for update;
  if not found then raise exception 'Этого номера нет в лиге. Попросите админа добавить вас'; end if;
  if r.locked_until is not null and r.locked_until > now() then
    raise exception 'Слишком много неверных попыток. Попробуйте через 15 минут';
  end if;
  if r.pin_hash is null then
    update public.poker_players set pin_hash = crypt(p_pin, gen_salt('bf')), failed = 0, locked_until = null where id = r.id;
    first_time := true;
  elsif r.pin_hash = crypt(p_pin, r.pin_hash) then
    update public.poker_players set failed = 0, locked_until = null where id = r.id;
  else
    update public.poker_players
       set failed = case when r.failed + 1 >= 5 then 0 else r.failed + 1 end,
           locked_until = case when r.failed + 1 >= 5 then now() + interval '15 minutes' else null end
     where id = r.id;
    return jsonb_build_object('error', case when r.failed + 1 >= 5
      then 'Неверный PIN. Вход закрыт на 15 минут'
      else 'Неверный PIN. Осталось попыток: ' || (4 - r.failed) end);
  end if;
  insert into public.poker_sessions (player_id) values (r.id) returning token into t;
  return jsonb_build_object('token', t, 'playerId', r.id, 'isAdmin', r.is_admin, 'firstTime', first_time);
end $$;

create or replace function public.poker_whoami(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r public.poker_players;
begin
  select p.* into r from public.poker_sessions s join public.poker_players p on p.id = s.player_id where s.token = p_token;
  if not found then return null; end if;
  return jsonb_build_object('playerId', r.id, 'isAdmin', r.is_admin);
end $$;

create or replace function public.poker_logout(p_token uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.poker_sessions where token = p_token;
$$;

create or replace function public.poker_change_pin(p_token uuid, p_old text, p_new text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare r public.poker_players := public.poker_auth(p_token);
begin
  if p_new !~ '^\d{4}$' then raise exception 'Новый PIN — это 4 цифры'; end if;
  if r.pin_hash <> crypt(p_old, r.pin_hash) then raise exception 'Старый PIN неверный'; end if;
  update public.poker_players set pin_hash = crypt(p_new, gen_salt('bf')) where id = r.id;
  delete from public.poker_sessions where player_id = r.id and token <> p_token;
end $$;

create or replace function public.poker_rename(p_token uuid, p_name text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.poker_players := public.poker_auth(p_token);
begin
  if length(trim(coalesce(p_name, ''))) not between 1 and 24 then raise exception 'Имя — от 1 до 24 символов'; end if;
  update public.poker_players set name = trim(p_name) where id = r.id;
end $$;

-- ---------- админ ----------

create or replace function public.poker_admin_players(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.poker_admin(p_token);
  return coalesce((select jsonb_object_agg(id, jsonb_build_object('phone', phone)) from public.poker_players), '{}'::jsonb);
end $$;

create or replace function public.poker_save_player(p_token uuid, p_id text, p_name text, p_phone text, p_is_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me public.poker_players := public.poker_admin(p_token);
  ph text := case when coalesce(trim(p_phone), '') = '' then null else public.poker_norm_phone(p_phone) end;
begin
  if length(trim(coalesce(p_name, ''))) not between 1 and 24 then raise exception 'Имя — от 1 до 24 символов'; end if;
  if ph is not null and exists (select 1 from public.poker_players where phone = ph and id <> p_id) then
    raise exception 'Этот номер уже у другого игрока';
  end if;
  if p_id = me.id and not p_is_admin then raise exception 'Нельзя снять админа с самого себя'; end if;
  insert into public.poker_players (id, name, phone, is_admin) values (p_id, trim(p_name), ph, p_is_admin)
  on conflict (id) do update set name = excluded.name, phone = excluded.phone, is_admin = excluded.is_admin,
    pin_hash = case when poker_players.phone is distinct from excluded.phone then null else poker_players.pin_hash end;
end $$;

create or replace function public.poker_delete_player(p_token uuid, p_id text) returns void
language plpgsql security definer set search_path = public as $$
declare me public.poker_players := public.poker_admin(p_token);
begin
  if p_id = me.id then raise exception 'Нельзя удалить самого себя'; end if;
  delete from public.poker_players where id = p_id;
end $$;

create or replace function public.poker_reset_pin(p_token uuid, p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.poker_admin(p_token);
  update public.poker_players set pin_hash = null, failed = 0, locked_until = null where id = p_id;
  delete from public.poker_sessions where player_id = p_id;
end $$;

create or replace function public.poker_save_game(p_token uuid, p_id text, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.poker_admin(p_token);
  insert into public.poker_games (id, data, updated_at) values (p_id, p_data - 'hasPhoto', now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end $$;

create or replace function public.poker_delete_game(p_token uuid, p_id text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.poker_admin(p_token);
  delete from public.poker_games where id = p_id;
end $$;

create or replace function public.poker_save_photo(p_token uuid, p_game text, p_data text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.poker_admin(p_token);
  if p_data is null or p_data = '' then delete from public.poker_photos where game_id = p_game; return; end if;
  if length(p_data) > 900000 then raise exception 'Фото слишком большое'; end if;
  insert into public.poker_photos (game_id, data) values (p_game, p_data)
  on conflict (game_id) do update set data = excluded.data;
end $$;

create or replace function public.poker_save_settings(p_token uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.poker_admin(p_token);
  insert into public.poker_settings (id, data) values (1, p_data) on conflict (id) do update set data = excluded.data;
end $$;

-- ---------- доступ ----------
-- Таблицы снаружи не видны; публичный ключ может вызывать только функции poker_* верхнего уровня.

revoke all on public.poker_players, public.poker_sessions, public.poker_games, public.poker_photos, public.poker_settings from anon, authenticated;
revoke execute on function public.poker_auth(uuid), public.poker_admin(uuid) from public, anon, authenticated;
grant execute on function
  public.poker_state(), public.poker_photo(text), public.poker_login(text, text), public.poker_whoami(uuid),
  public.poker_logout(uuid), public.poker_change_pin(uuid, text, text), public.poker_rename(uuid, text),
  public.poker_admin_players(uuid), public.poker_save_player(uuid, text, text, text, boolean),
  public.poker_delete_player(uuid, text), public.poker_reset_pin(uuid, text), public.poker_save_game(uuid, text, jsonb),
  public.poker_delete_game(uuid, text), public.poker_save_photo(uuid, text, text), public.poker_save_settings(uuid, jsonb)
to anon, authenticated;

-- ---------- первый админ ----------
-- Замените 79990000000 на свой номер (и имя, если хотите), потом нажмите Run.
-- При первом входе на сайте вы сами придумаете 4-значный PIN.
insert into public.poker_players (id, name, phone, is_admin)
values ('admin', 'Давид', '79990000000', true)
on conflict (id) do update set is_admin = true;
