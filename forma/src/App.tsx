import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { FormaData } from './types';
import { DEFAULT_SETTINGS, load, loadSettings, requestPersist, save, saveSettings, type Settings as AppSettings } from './storage';
import { longD, todayKey } from './lib/format';
import { Overview } from './components/Overview';
import { Bench } from './components/Bench';
import { Calendar } from './components/Calendar';
import { Train } from './components/Train';
import { Diary } from './components/Diary';
import { Settings } from './components/Settings';
import { EntryBar } from './components/EntryBar';
import { Advisor } from './components/Advisor';
import { Onboarding } from './components/Onboarding';
import { ProfileSettings } from './components/ProfileSettings';
import { logError } from './lib/bugs';
import { CloudError, cloudEnabled, getSession, onAuth, pullClient, pullOwn, pushDiary } from './lib/cloud';

const TABS = [
  { id: 'overview', l: 'Обзор' },
  { id: 'bench', l: 'Жим' },
  { id: 'cal', l: 'Календарь' },
  { id: 'train', l: 'Тренировки' },
  { id: 'diary', l: 'Дневник' },
  { id: 'advisor', l: 'Советник' },
] as const;
type Tab = (typeof TABS)[number]['id'] | 'settings';

export type SyncState = 'off' | 'ok' | 'saving' | 'error';
/** Дневник клиента с сервера: тренер смотрит и может исправлять. */
type ClientView = { userId: string; data: FormaData };

const stamp = (d: FormaData): FormaData => ({ ...d, updatedAt: new Date().toISOString() });

export function App() {
  const [data, setData] = useState<FormaData | null>(null);
  const [firstRun, setFirstRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [today, setToday] = useState(todayKey);
  const [persisted, setPersisted] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);
  // Чужой дневник из файла — только просмотр, свой при этом не трогается.
  const [viewing, setViewing] = useState<FormaData | null>(null);
  const [client, setClient] = useState<ClientView | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sync, setSync] = useState<SyncState>('off');

  const dataRef = useRef<FormaData | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();
  dataRef.current = data;
  sessionRef.current = session;

  const notify = useCallback((msg: string, err?: boolean) => {
    if (err) logError(msg);
    setToast({ msg, err });
  }, []);

  // ---- Синхронизация своего дневника ----

  const pushOwn = useCallback((d: FormaData, now = false) => {
    const s = sessionRef.current;
    if (!s) return;
    clearTimeout(pushTimer.current);
    const run = () => {
      setSync('saving');
      pushDiary(s.user.id, s.user.id, d, s.user.email)
        .then(() => setSync('ok'))
        .catch(e => { setSync('error'); logError(String(e?.message || e)); });
    };
    if (now) run(); else pushTimer.current = setTimeout(run, 1500);
  }, []);

  /** Сводим дневник телефона и аккаунта: побеждает более свежий; чужой дневник в аккаунт сам не попадает. */
  const reconcile = useCallback(async (s: Session) => {
    const uid = s.user.id;
    try {
      setSync('saving');
      const remote = await pullOwn(uid);
      const local = dataRef.current;
      const mine = (d: FormaData) => ({ ...d, ownerId: uid });
      if (remote) {
        const foreign = local && local.ownerId && local.ownerId !== uid;
        const unsynced = local && !local.ownerId && local.days.length > 0;
        const localAt = local?.updatedAt || '';
        const useRemote = !local || foreign || (unsynced
          ? confirm(`На этом телефоне есть дневник «${local!.profile?.name || 'без имени'}», а в аккаунте — «${remote.data.profile?.name || 'без имени'}».\n\nОК — открыть дневник из аккаунта.\nОтмена — заменить дневник в аккаунте дневником с телефона.`)
          : remote.updatedAt > localAt);
        // Одинаковые версии — ничего не делаем (иначе можно затереть чужую правку).
        if (!useRemote && !unsynced && local!.ownerId === uid && remote.updatedAt === localAt) { setSync('ok'); return; }
        if (useRemote) {
          const d = mine(remote.data);
          setData(d); setFirstRun(false);
          await save(d);
        } else {
          const d = mine(local!);
          setData(d); await save(d);
          await pushDiary(uid, uid, d, s.user.email);
        }
      } else if (local) {
        const foreign = local.ownerId && local.ownerId !== uid;
        if (foreign || (local.days.length > 0 && !confirm(`В аккаунте пока пусто. Загрузить в него дневник с этого телефона («${local.profile?.name || 'без имени'}»)?\n\nОтмена — начать в аккаунте с чистого листа.`))) {
          setData(null); setFirstRun(true); // покажется анкета; после неё дневник уйдёт в аккаунт
        } else {
          const d = mine(local);
          setData(d); await save(d);
          await pushDiary(uid, uid, d, s.user.email);
        }
      }
      setSync('ok');
    } catch (e) {
      setSync('error');
      notify(e instanceof CloudError ? e.message : 'Ошибка синхронизации: ' + (e as Error).message, true);
    }
  }, [notify]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      try {
        const d = await load();
        if (d) setData(d); else setFirstRun(true);
        dataRef.current = d;
      } catch (e) {
        setError(String((e as Error)?.message || e));
        return;
      }
      if (!cloudEnabled) return;
      const s = await getSession().catch(() => null);
      setSession(s); sessionRef.current = s;
      if (s) reconcile(s);
      unsub = onAuth(next => {
        const prev = sessionRef.current;
        setSession(next); sessionRef.current = next;
        if (!next) setSync('off');
        else if (next.user.id !== prev?.user.id) reconcile(next);
      });
    })();
    loadSettings().then(setSettings).catch(() => {});
    requestPersist().then(setPersisted);
    // Вернулись в приложение: обновляем «сегодня» и подтягиваем свежий дневник с сервера.
    const onShow = () => {
      if (document.visibilityState !== 'visible') return;
      setToday(todayKey());
      if (sessionRef.current) reconcile(sessionRef.current);
    };
    document.addEventListener('visibilitychange', onShow);
    return () => { unsub(); document.removeEventListener('visibilitychange', onShow); };
  }, [reconcile]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Сохранение ----

  const replace = useCallback((next: FormaData) => {
    const uid = sessionRef.current?.user.id;
    const d = stamp(uid ? { ...next, ownerId: uid } : next);
    setData(d);
    save(d).catch(() => notify('Не удалось сохранить изменения', true));
    pushOwn(d, true);
  }, [notify, pushOwn]);

  const update = useCallback((fn: (d: FormaData) => FormaData) => {
    setData(prev => {
      if (!prev) return prev;
      const next = stamp(fn(prev));
      save(next).catch(() => notify('Не удалось сохранить изменения', true));
      pushOwn(next);
      return next;
    });
  }, [notify, pushOwn]);

  // Правка дневника клиента: сразу на сервер, у клиента подтянется при следующем открытии.
  const updateClient = useCallback((fn: (d: FormaData) => FormaData) => {
    setClient(prev => {
      const s = sessionRef.current;
      if (!prev || !s) return prev;
      const next = { ...prev, data: stamp(fn(prev.data)) };
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        setSync('saving');
        pushDiary(prev.userId, s.user.id, next.data)
          .then(() => setSync('ok'))
          .catch(e => { setSync('error'); notify(e instanceof CloudError ? e.message : String(e), true); });
      }, 800);
      return next;
    });
  }, [notify]);

  const openClient = useCallback(async (userId: string) => {
    try {
      const d = await pullClient(userId);
      setViewing(null);
      setClient({ userId, data: d });
      setTab('overview'); window.scrollTo(0, 0);
    } catch (e) {
      notify(e instanceof CloudError ? e.message : String(e), true);
    }
  }, [notify]);

  const changeSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    saveSettings(s).catch(() => notify('Не удалось сохранить настройки', true));
  }, [notify]);

  const pick = (t: Tab) => { setTab(t); window.scrollTo(0, 0); };

  const shown = client?.data ?? viewing ?? data;
  const readOnly = useCallback(() => notify('Это чужой дневник — только просмотр'), [notify]);
  const edit = client ? updateClient : viewing ? readOnly : update;
  const other = !!(client || viewing);
  const tabs = other ? TABS.filter(t => t.id !== 'advisor') : TABS;
  const exitOther = () => { setClient(null); setViewing(null); pick('overview'); };

  return (
    <div className="fw">
      <div className="fw-head">
        <p className="fw-title">ФОРМА</p>
        <div className="fw-head-r">
          <span className="fw-sub">{longD(today)}{sync === 'saving' ? ' · ⟳' : sync === 'error' ? ' · ⚠' : ''}</span>
          {data && <button className={'icon-btn' + (tab === 'settings' ? ' active' : '')} aria-label="Данные и резервная копия"
            onClick={() => pick(tab === 'settings' ? 'overview' : 'settings')}>⚙</button>}
        </div>
      </div>
      {data && (
        <>
          {client
            ? <div className="viewing">👤 Клиент: <b>{client.data.profile?.name || 'без имени'}</b> · правки сохраняются у него
                <button className="btn ghost" onClick={() => openClient(client.userId)}>Обновить</button>
                <button className="btn ghost" onClick={exitOther}>Выйти</button></div>
            : viewing
              ? <div className="viewing">👀 Дневник: <b>{viewing.profile?.name || 'без имени'}</b> · только просмотр <button className="btn ghost" onClick={exitOther}>Выйти</button></div>
              : <div className="hint">Пиши внизу, что ел и что делал, — ИИ разберёт и запишет. {session ? 'Дневник сохраняется в аккаунте.' : 'Данные хранятся на телефоне, копия — в ⚙.'}</div>}
          <div className="tabs">
            {tabs.map(t => (
              <button key={t.id} className={'tab-btn' + (tab === t.id ? ' active' : '')} onClick={() => pick(t.id)}>{t.l}</button>
            ))}
          </div>
        </>
      )}

      {error && <div className="card"><div className="empty">Не удалось открыть данные: {error}</div></div>}
      {!data && !error && !firstRun && <div className="empty">Загрузка…</div>}
      {!data && firstRun && <Onboarding notify={notify} session={session} onDone={d => { replace(d); setFirstRun(false); }} />}
      {data && shown && (
        <>
          {tab === 'overview' && <Overview data={shown} today={today} />}
          {tab === 'bench' && <Bench data={shown} />}
          {tab === 'cal' && <Calendar key={client ? 'c' + client.userId : viewing ? 'v' : 'own'} data={shown} today={today} update={edit} ai={{ settings, notify }} />}
          {tab === 'train' && <Train data={shown} today={today} update={edit} />}
          {tab === 'diary' && <Diary data={shown} />}
          {tab === 'settings' && client && (
            <>
              <div className="card">
                <div className="card-label">Настройки клиента</div>
                <div className="blk-b">Профиль, нормы и план тренировок <b>{client.data.profile?.name || 'клиента'}</b>. Изменения сохранятся у него. Свои настройки (аккаунт, ключ ИИ) — после «Выйти» на жёлтой плашке.</div>
              </div>
              <ProfileSettings key={'c' + client.userId + (client.data.updatedAt || '')} data={client.data} update={updateClient} notify={notify} />
            </>
          )}
          {tab === 'settings' && !client && <Settings data={data} settings={settings} saveSettings={changeSettings} persisted={persisted} replace={replace} update={update} notify={notify}
            view={d => { setClient(null); setViewing(d); pick('overview'); }} session={session} sync={sync} openClient={openClient} />}
          {!other && tab === 'advisor' && <Advisor data={data} settings={settings} today={today} notify={notify} openSettings={() => pick('settings')} />}
          {!viewing && tab !== 'advisor' && tab !== 'settings' && <EntryBar data={shown} settings={settings} today={today} update={edit} notify={notify} openSettings={() => pick('settings')} />}
        </>
      )}

      {toast && <div className={'toast' + (toast.err ? ' err' : '')}>{toast.msg}</div>}
    </div>
  );
}
