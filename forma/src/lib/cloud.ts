// Онлайн-аккаунты и синхронизация дневника через Supabase.
// Дневник целиком хранится одной строкой (diaries.data); побеждает более свежая версия по data.updatedAt.

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '../config';
import { migrate, type StoredTurn } from '../storage';
import type { FormaData } from '../types';

export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

let sb: SupabaseClient | null = null;
export function supa(): SupabaseClient {
  if (!sb) sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}

export class CloudError extends Error {}

function explain(e: { message?: string; status?: number; code?: string } | null, what: string): never {
  const m = e?.message || '';
  if (/Invalid login credentials/i.test(m)) throw new CloudError('Неверная почта или пароль.');
  if (/already registered|already exists/i.test(m)) throw new CloudError('Такая почта уже зарегистрирована — нажми «Войти».');
  if (/Password should be/i.test(m)) throw new CloudError('Пароль слишком короткий — нужно минимум 6 символов.');
  if (/Email not confirmed/i.test(m)) throw new CloudError('Почта не подтверждена. Открой письмо от Supabase и нажми ссылку.');
  if (/valid email|invalid format/i.test(m)) throw new CloudError('Проверь адрес почты.');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) throw new CloudError('Нет связи с сервером. Проверь интернет (может понадобиться VPN).');
  throw new CloudError(`${what}: ${m || 'неизвестная ошибка'}`);
}

// ---- Вход ----

export async function getSession(): Promise<Session | null> {
  const { data } = await supa().auth.getSession();
  return data.session;
}

export function onAuth(cb: (s: Session | null) => void) {
  const { data } = supa().auth.onAuthStateChange((_e, s) => cb(s));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string) {
  const { error } = await supa().auth.signInWithPassword({ email: email.trim(), password });
  if (error) explain(error, 'Не получилось войти');
}

/** Регистрация. Если в Supabase включено подтверждение почты — вернёт needConfirm. */
export async function signUp(email: string, password: string): Promise<{ needConfirm: boolean }> {
  const { data, error } = await supa().auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) explain(error, 'Не получилось зарегистрироваться');
  return { needConfirm: !data.session };
}

export async function signOut() {
  await supa().auth.signOut();
}

// ---- Свой дневник ----

export type Remote = { data: FormaData; updatedAt: string } | null;

export async function pullOwn(userId: string): Promise<Remote> {
  const { data, error } = await supa().from('diaries').select('data').eq('user_id', userId).maybeSingle();
  if (error) explain(error, 'Не получилось загрузить дневник');
  if (!data) return null;
  const d = migrate(data.data);
  return { data: d, updatedAt: d.updatedAt || '' };
}

/** Сохранить дневник на сервер. userId — чей дневник (свой или клиента), editorId — кто сохраняет. */
export async function pushDiary(userId: string, editorId: string, d: FormaData, email?: string) {
  const row = { user_id: userId, name: d.profile?.name ?? null, data: d, updated_at: new Date().toISOString(), updated_by: editorId, ...(email ? { email } : {}) };
  const { error } = userId === editorId
    ? await supa().from('diaries').upsert(row)
    : await supa().from('diaries').update(row).eq('user_id', userId);
  if (error) explain(error, 'Не получилось сохранить на сервер');
}

// ---- Тренер ----

export async function listCoaches(ownerId: string): Promise<string[]> {
  const { data, error } = await supa().from('coaches').select('coach_email').eq('owner_id', ownerId);
  if (error) explain(error, 'Не получилось загрузить список');
  return (data || []).map(r => r.coach_email as string);
}

export async function addCoach(ownerId: string, email: string) {
  const { error } = await supa().from('coaches').upsert({ owner_id: ownerId, coach_email: email.trim().toLowerCase() });
  if (error) explain(error, 'Не получилось дать доступ');
}

export async function removeCoach(ownerId: string, email: string) {
  const { error } = await supa().from('coaches').delete().eq('owner_id', ownerId).eq('coach_email', email);
  if (error) explain(error, 'Не получилось убрать доступ');
}

export type Client = { userId: string; name: string; email: string; updatedAt: string };

/** Дневники, к которым мне дали доступ (правила базы сами отфильтруют чужие). */
export async function listClients(myId: string): Promise<Client[]> {
  const { data, error } = await supa().from('diaries').select('user_id, name, email, updated_at').neq('user_id', myId).order('updated_at', { ascending: false });
  if (error) explain(error, 'Не получилось загрузить клиентов');
  return (data || []).map(r => ({ userId: r.user_id, name: r.name || 'без имени', email: r.email || '', updatedAt: r.updated_at }));
}

export async function pullClient(userId: string): Promise<FormaData> {
  const { data, error } = await supa().from('diaries').select('data').eq('user_id', userId).single();
  if (error) explain(error, 'Не получилось открыть дневник');
  return migrate(data.data);
}

// ---- Переписка с советником ----


/** Сохранить свою переписку с советником в аккаунт (строка дневника уже должна существовать). */
export async function pushChat(userId: string, turns: StoredTurn[]) {
  const { error } = await supa().from('diaries').update({ chat: turns }).eq('user_id', userId);
  if (error) explain(error, 'Не получилось сохранить переписку');
}

/** Переписка с советником: своя или клиента. Пусто, если её ещё нет на сервере. */
export async function pullChat(userId: string): Promise<StoredTurn[]> {
  const { data, error } = await supa().from('diaries').select('chat').eq('user_id', userId).maybeSingle();
  if (error) {
    if (/column .*chat/i.test(error.message)) throw new CloudError('В Supabase нет колонки для переписки — нужно выполнить новую строку из schema.sql.');
    explain(error, 'Не получилось загрузить переписку');
  }
  return (data?.chat as StoredTurn[] | null) || [];
}
