// Постоянное хранилище: IndexedDB в браузере телефона.
// Все данные лежат одной записью; при первом запуске туда кладутся данные из seed.json.

import seed from './data/seed.json';
import type { Day, FormaData } from './types';
import { addMacros } from './lib/entry';

export const SCHEMA_VERSION = 2;
const DB_NAME = 'forma';
const STORE = 'state';
const KEY = 'main';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); resolve(req.result); };
    t.onerror = () => { db.close(); reject(t.error); };
  }));
}

/** Приводит данные любой старой версии к текущей схеме. Сюда добавлять шаги при смене схемы. */
export function migrate(raw: unknown): FormaData {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as FormaData).days)) {
    throw new Error('Это не похоже на файл «Формы»: нет списка дней.');
  }
  const d = { ...(raw as Partial<FormaData>) };
  // v0 → v1: исходный forma-data.json без номера версии.
  if (!d.schemaVersion) {
    d.targets ??= { p: 130, f: 90, c: 390, kcal: 3100, fib: 28 };
    d.sore ??= {};
    d.marks ??= {};
    d.weight ??= [];
    d.bench ??= [];
    d.products ??= [];
    d.supplements ??= [];
    d.split ??= {};
    d.schemaVersion = 1;
  }
  // v1 → v2: у дня появились необязательные meals и exercises — преобразовывать нечего.
  if (d.schemaVersion === 1) d.schemaVersion = 2;
  if (d.schemaVersion > SCHEMA_VERSION) {
    throw new Error('Файл сделан более новой версией приложения. Обнови приложение.');
  }
  return d as FormaData;
}

/** Версия встроенных данных. Новая выгрузка из чата → новый exportedAt → слияние при запуске. */
export const SEED_REV = (seed as { exportedAt?: string }).exportedAt || 'initial';

export function seedData(): FormaData {
  return { ...migrate(structuredClone(seed)), seedRev: SEED_REV };
}

/**
 * Вливает новую выгрузку из чата в данные телефона, ничего не теряя:
 * поля дня из чата обновляются, записи, сделанные в приложении (meals/exercises), остаются
 * и прибавляются к итогу дня. Отметки, вес и жим объединяются.
 */
export function mergeSeed(cur: FormaData, fresh: FormaData): FormaData {
  const days = new Map(cur.days.map(d => [d.date, d]));
  for (const s of fresh.days) {
    const old = days.get(s.date);
    if (!old) { days.set(s.date, s); continue; }
    const appMade = !!(old.meals?.length || old.exercises?.length);
    const { meals: _m, exercises: _e, ...chat } = s;
    const day: Day = { ...chat, meals: old.meals, exercises: old.exercises };
    if (!day.meals) delete day.meals;
    if (!day.exercises) delete day.exercises;
    if (old.meals?.length) day.macros = addMacros(s.macros, old.meals);
    const groups = new Set([...(s.groups || []), ...(old.groups || [])]);
    if (groups.size) day.groups = [...groups];
    // Если день уже закрыт в приложении с выводом — не открываем его заново.
    if (appMade && old.partial === false) { day.partial = false; if (old.verdict) day.verdict = old.verdict; }
    days.set(s.date, day);
  }
  const marks = { ...cur.marks };
  for (const [k, m] of Object.entries(fresh.marks)) marks[k] = { p: !!(m.p || marks[k]?.p), g: !!(m.g || marks[k]?.g) };
  const weight = [...cur.weight];
  for (const w of fresh.weight) if (!weight.some(x => x.date === w.date)) weight.push(w);
  const bench = [...cur.bench];
  for (const b of fresh.bench) if (!bench.some(x => x.date === b.date && x.w === b.w && x.r === b.r)) bench.push(b);
  const sore = { ...cur.sore };
  for (const [g, d] of Object.entries(fresh.sore)) if (!sore[g] || sore[g] < d) sore[g] = d;
  const products = fresh.products.map(p => {
    const o = cur.products.find(x => x.name === p.name);
    return o ? { ...p, times: Math.max(p.times, o.times) } : p;
  });
  for (const o of cur.products) if (!products.some(p => p.name === o.name)) products.push(o);
  return {
    ...cur,
    profile: cur.profile ?? fresh.profile,
    days: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
    marks, weight, bench, sore, products,
    supplements: fresh.supplements, split: fresh.split, benchMax: fresh.benchMax, oldBenchMax: fresh.oldBenchMax,
    soberSince: fresh.soberSince,
    seedRev: SEED_REV,
  };
}

/**
 * Данные с телефона или null, если это первый запуск (тогда показывается анкета).
 * Данные Давида (из чата) доливаются новой выгрузкой только к его же дневнику — по seedRev.
 */
export async function load(): Promise<FormaData | null> {
  const stored = await tx<unknown>('readonly', s => s.get(KEY));
  if (!stored) return null;
  let cur = migrate(stored);
  if (!cur.seedRev) return cur; // дневник нового пользователя — выгрузки из чата его не касаются
  if (!cur.profile) cur = { ...cur, profile: seedData().profile };
  if (cur.seedRev !== SEED_REV) cur = mergeSeed(cur, seedData());
  await save(cur);
  return cur;
}

export async function save(data: FormaData): Promise<void> {
  await tx('readwrite', s => s.put(data, KEY));
}

/** Просим браузер не удалять данные при нехватке места. */
export async function requestPersist(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// ---- Настройки (ключ API и модель). Хранятся отдельно и НЕ попадают в резервную копию. ----

export type ModelId = 'claude-opus-5-5' | 'claude-haiku-5-5';
export interface Settings {
  provider: 'gemini' | 'claude';
  geminiKey: string;
  geminiModel: string; // выбирается из списка моделей, доступных ключу
  apiKey: string; // ключ Claude
  model: ModelId; // модель Claude
}
const SETTINGS_KEY = 'settings';
export const DEFAULT_SETTINGS: Settings = { provider: 'gemini', geminiKey: '', geminiModel: '', apiKey: '', model: 'claude-opus-5-5' };

export async function loadSettings(): Promise<Settings> {
  const s = await tx<Partial<Settings> | undefined>('readonly', st => st.get(SETTINGS_KEY));
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await tx('readwrite', st => st.put(s, SETTINGS_KEY));
}

// ---- История чата с советником (только на телефоне, не в резервной копии) ----
// Своя переписка — 'chat', переписка о клиенте — 'chat:<id клиента>'.
export type StoredTurn = {
  role: 'user' | 'assistant';
  text: string;
  at: string;
  actions?: import('./lib/advice').Action[]; // что советник предложил изменить
  status?: ('applied' | 'skipped' | 'stale' | 'undone' | null)[]; // что с этим сделали (stale — устарело: пришли новые предложения)
  diffs?: import('./lib/advice').DiffRow[][]; // «было → станет» на момент ответа
  files?: { name: string; kind: 'image' | 'pdf' | 'text'; thumb?: string }[]; // что было прикреплено (сами файлы не храним)
};

export async function loadChat(key = 'chat'): Promise<StoredTurn[]> {
  return (await tx<StoredTurn[] | undefined>('readonly', st => st.get(key))) || [];
}

export async function saveChat(turns: StoredTurn[], key = 'chat'): Promise<void> {
  await tx('readwrite', st => st.put(turns.slice(-60), key));
}

// ---- Отмена последней правки советника: снимок дневника до правки (только на телефоне) ----
export type UndoSnap = { label: string; before: import('./types').FormaData; after: string; turn: number; actions: number[] };

export async function loadUndo(key: string): Promise<UndoSnap | null> {
  return (await tx<UndoSnap | undefined>('readonly', st => st.get('undo:' + key))) || null;
}

export async function saveUndo(key: string, snap: UndoSnap | null): Promise<void> {
  if (snap) await tx('readwrite', st => st.put(snap, 'undo:' + key));
  else await tx('readwrite', st => st.delete('undo:' + key));
}
