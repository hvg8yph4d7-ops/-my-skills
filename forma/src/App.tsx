import { useCallback, useEffect, useState } from 'react';
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
import { logError } from './lib/bugs';

const TABS = [
  { id: 'overview', l: 'Обзор' },
  { id: 'bench', l: 'Жим' },
  { id: 'cal', l: 'Календарь' },
  { id: 'train', l: 'Тренировки' },
  { id: 'diary', l: 'Дневник' },
  { id: 'advisor', l: 'Советник' },
] as const;
type Tab = (typeof TABS)[number]['id'] | 'settings';

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

  useEffect(() => {
    load().then(d => (d ? setData(d) : setFirstRun(true))).catch(e => setError(String(e?.message || e)));
    loadSettings().then(setSettings).catch(() => {});
    requestPersist().then(setPersisted);
    // Приложение может висеть открытым с вечера до утра — обновляем «сегодня».
    const onShow = () => setToday(todayKey());
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = useCallback((msg: string, err?: boolean) => {
    if (err) logError(msg);
    setToast({ msg, err });
  }, []);

  const replace = useCallback((next: FormaData) => {
    setData(next);
    save(next).catch(() => notify('Не удалось сохранить изменения', true));
  }, [notify]);

  const update = useCallback((fn: (d: FormaData) => FormaData) => {
    setData(prev => {
      if (!prev) return prev;
      const next = fn(prev);
      save(next).catch(() => notify('Не удалось сохранить изменения', true));
      return next;
    });
  }, [notify]);

  const changeSettings = useCallback((s: AppSettings) => {
    setSettings(s);
    saveSettings(s).catch(() => notify('Не удалось сохранить настройки', true));
  }, [notify]);

  const pick = (t: Tab) => { setTab(t); window.scrollTo(0, 0); };

  const shown = viewing ?? data;
  const readOnly = useCallback(() => notify('Это чужой дневник — только просмотр'), [notify]);
  const edit = viewing ? readOnly : update;
  const tabs = viewing ? TABS.filter(t => t.id !== 'advisor') : TABS;

  return (
    <div className="fw">
      <div className="fw-head">
        <p className="fw-title">ФОРМА</p>
        <div className="fw-head-r">
          <span className="fw-sub">{longD(today)}</span>
          {data && <button className={'icon-btn' + (tab === 'settings' ? ' active' : '')} aria-label="Данные и резервная копия"
            onClick={() => pick(tab === 'settings' ? 'overview' : 'settings')}>⚙</button>}
        </div>
      </div>
      {data && (
        <>
          {viewing
            ? <div className="viewing">👀 Дневник: <b>{viewing.profile?.name || 'без имени'}</b> · только просмотр <button className="btn ghost" onClick={() => { setViewing(null); pick('overview'); }}>Выйти</button></div>
            : <div className="hint">Пиши внизу, что ел и что делал, — ИИ разберёт и запишет. Данные хранятся на телефоне, копия — в ⚙.</div>}
          <div className="tabs">
            {tabs.map(t => (
              <button key={t.id} className={'tab-btn' + (tab === t.id ? ' active' : '')} onClick={() => pick(t.id)}>{t.l}</button>
            ))}
          </div>
        </>
      )}

      {error && <div className="card"><div className="empty">Не удалось открыть данные: {error}</div></div>}
      {!data && !error && !firstRun && <div className="empty">Загрузка…</div>}
      {!data && firstRun && <Onboarding notify={notify} onDone={d => { replace(d); setFirstRun(false); }} />}
      {data && (
        <>
          {shown && tab === 'overview' && <Overview data={shown} today={today} />}
          {shown && tab === 'bench' && <Bench data={shown} />}
          {shown && tab === 'cal' && <Calendar key={viewing ? 'v' : 'own'} data={shown} today={today} update={edit} ai={{ settings, notify }} />}
          {shown && tab === 'train' && <Train data={shown} today={today} update={edit} />}
          {shown && tab === 'diary' && <Diary data={shown} />}
          {tab === 'settings' && <Settings data={data} settings={settings} saveSettings={changeSettings} persisted={persisted} replace={replace} update={update} notify={notify} view={d => { setViewing(d); pick('overview'); }} />}
          {!viewing && tab === 'advisor' && <Advisor data={data} settings={settings} today={today} notify={notify} openSettings={() => pick('settings')} />}
          {!viewing && tab !== 'advisor' && tab !== 'settings' && <EntryBar data={data} settings={settings} today={today} update={update} notify={notify} openSettings={() => pick('settings')} />}
        </>
      )}

      {toast && <div className={'toast' + (toast.err ? ' err' : '')}>{toast.msg}</div>}
    </div>
  );
}
