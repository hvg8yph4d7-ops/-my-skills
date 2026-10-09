// Постоянное хранилище: IndexedDB в браузере телефона.
// Все данные лежат одной записью; при первом запуске туда кладутся данные из seed.json.

import seed from './data/seed.json';
import type { FormaData } from './types';

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

export function seedData(): FormaData {
  return migrate(structuredClone(seed));
}

export async function load(): Promise<FormaData> {
  const stored = await tx<unknown>('readonly', s => s.get(KEY));
  if (stored) return migrate(stored);
  const fresh = seedData();
  await save(fresh);
  return fresh;
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
  apiKey: string;
  model: ModelId;
}
const SETTINGS_KEY = 'settings';
export const DEFAULT_SETTINGS: Settings = { apiKey: '', model: 'claude-opus-5-5' };

export async function loadSettings(): Promise<Settings> {
  const s = await tx<Partial<Settings> | undefined>('readonly', st => st.get(SETTINGS_KEY));
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await tx('readwrite', st => st.put(s, SETTINGS_KEY));
}
