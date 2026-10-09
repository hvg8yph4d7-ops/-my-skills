import { useRef, useState } from 'react';
import { BUILD, bugReport, shareText } from '../lib/bugs';
import type { FormaData } from '../types';
import { migrate, seedData, type Settings as AppSettings } from '../storage';
import { AiSettings } from './AiSettings';
import { ProfileSettings } from './ProfileSettings';
import { AccountSettings } from './AccountSettings';
import type { Session } from '@supabase/supabase-js';
import type { SyncState } from '../App';
import { todayKey } from '../lib/format';

type Props = {
  data: FormaData;
  settings: AppSettings;
  saveSettings: (s: AppSettings) => void;
  persisted: boolean;
  replace: (d: FormaData) => void;
  update: (fn: (d: FormaData) => FormaData) => void;
  view: (d: FormaData) => void;
  session: Session | null;
  sync: SyncState;
  openClient: (userId: string) => void;
  notify: (msg: string, err?: boolean) => void;
  clearChat: () => void;
};

export function Settings({ data, settings, saveSettings, persisted, replace, update, view, notify, session, sync, openClient, clearChat }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef<HTMLInputElement>(null);
  const [what, setWhat] = useState('');

  const openFriend = async (f: File) => {
    try { view(migrate(JSON.parse(await f.text()))); }
    catch (e) { notify('Не получилось открыть файл: ' + (e as Error).message, true); }
  };

  const sendBug = async () => {
    const text = bugReport({
      what: what.trim(), who: data.profile?.name || '—', days: data.days.length,
      provider: settings.provider, model: settings.provider === 'claude' ? settings.model : settings.geminiModel,
      hasKey: settings.provider === 'claude' ? !!settings.apiKey : !!settings.geminiKey,
    });
    const r = await shareText(text);
    if (r === 'copied') notify('Отчёт скопирован — вставь его в сообщение');
    if (r !== 'failed') setWhat('');
  };

  const exportJson = async () => {
    // Имя латиницей: некоторые браузеры не принимают кириллицу в имени файла.
    const TR: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e', ю: 'yu', я: 'ya' };
    const who = [...(data.profile?.name || 'backup')]
      .map(ch => { const l = ch.toLowerCase(), t = TR[l]; return t === undefined ? ch : ch === l ? t : t.charAt(0).toUpperCase() + t.slice(1); })
      .join('').replace(/[^A-Za-z0-9-]+/g, '') || 'backup';
    const name = `forma-${who}-${todayKey()}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    // На iPhone удобнее системное меню «Поделиться» → «Сохранить в Файлы».
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; }
      catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importJson = async (f: File) => {
    try {
      const next = migrate(JSON.parse(await f.text()));
      if (!confirm(`Заменить текущие данные (${data.days.length} дн.) данными из файла (${next.days.length} дн.)?`)) return;
      replace(next);
      notify('Данные загружены из файла');
    } catch (e) {
      notify('Не получилось прочитать файл: ' + (e as Error).message, true);
    }
  };

  const startOver = () => {
    if (!confirm('Удалить весь дневник с этого телефона и пройти анкету заново? Сначала лучше скачать копию.')) return;
    if (!confirm('Точно удалить? Это не отменить.')) return;
    indexedDB.deleteDatabase('forma');
    location.reload();
  };

  const reset = () => {
    if (!confirm('Вернуть исходные данные из чата (14.09–09.10)? Всё, что добавлено в приложении, пропадёт. Сначала лучше скачать копию.')) return;
    replace(seedData());
    notify('Исходные данные восстановлены');
  };

  return (
    <>
      <AccountSettings session={session} sync={sync} notify={notify} openClient={openClient} />

      <AiSettings settings={settings} saveSettings={saveSettings} notify={notify} />

      <ProfileSettings key={data.profile?.name ?? ''} data={data} update={update} notify={notify} />

      <div className="card">
        <div className="card-label">Резервная копия</div>
        <div className="blk-b" style={{ marginBottom: 12 }}>
          Данные хранятся только на этом телефоне. Время от времени сохраняй копию в «Файлы» или отправляй себе в Telegram.
        </div>
        <div className="btn-col">
          <button className="btn" onClick={exportJson}>Сохранить или отправить дневник</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Загрузить из файла</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        </div>
      </div>

      <div className="card">
        <div className="card-label">Что сейчас в приложении</div>
        <div className="list-row"><div>Дней в дневнике</div><div className="val">{data.days.length}</div></div>
        <div className="list-row"><div>Взвешиваний</div><div className="val">{data.weight.length}</div></div>
        <div className="list-row"><div>Подходов в жиме</div><div className="val">{data.bench.length}</div></div>
        <div className="list-row"><div>Продуктов в справочнике</div><div className="val">{data.products.length}</div></div>
        <div className="sub-note">
          {persisted
            ? 'Хранилище защищено: браузер не будет удалять данные сам.'
            : 'Чтобы iPhone не удалил данные, добавь приложение на главный экран: «Поделиться» → «На экран „Домой“».'}
        </div>
      </div>

      <div className="card">
        <div className="card-label">Дневник друга</div>
        <div className="blk-b" style={{ marginBottom: 12 }}>
          Друг жмёт «Сохранить или отправить дневник» и шлёт тебе файл. Открой его здесь — увидишь все его вкладки. Твой дневник не изменится.
        </div>
        <button className="btn ghost full" onClick={() => viewRef.current?.click()}>Посмотреть чужой дневник</button>
        <input ref={viewRef} type="file" accept="application/json,.json" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) openFriend(f); e.target.value = ''; }} />
      </div>

      <div className="card">
        <div className="card-label">Советник</div>
        <div className="blk-b" style={{ marginBottom: 12 }}>Переписка хранится на телефоне{session ? ' и в аккаунте' : ''}. Дневник при очистке не меняется.</div>
        <button className="btn ghost full" onClick={clearChat}>Очистить переписку с советником</button>
      </div>

      <div className="card">
        <div className="card-label">Сообщить об ошибке</div>
        <textarea className="inp full" rows={2} value={what} onChange={e => setWhat(e.target.value)} placeholder="Что случилось? Например: нажал ➤, ничего не произошло" />
        <button className="btn ghost full" onClick={sendBug}>Отправить отчёт</button>
        <div className="sub-note">В отчёт попадут версия приложения, модель ИИ и последние ошибки. Ключи и записи дневника — нет.</div>
      </div>

      <div className="card">
        <div className="card-label">Сброс</div>
        <div className="btn-col">
          {data.seedRev && <button className="btn danger" onClick={reset}>Вернуть исходные данные из чата</button>}
          <button className="btn danger" onClick={startOver}>Удалить всё и начать заново</button>
        </div>
      </div>
      <div className="sub-note" style={{ textAlign: 'center' }}>Версия от {BUILD}</div>
    </>
  );
}
