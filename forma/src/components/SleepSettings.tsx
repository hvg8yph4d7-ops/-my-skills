import { useState } from 'react';
import { SUPABASE_KEY, SUPABASE_URL } from '../config';
import { CloudError, setSleepToken } from '../lib/cloud';
import { newSleepToken } from '../lib/sleep';

const LS = 'forma-sleep-token';
const read = () => { try { return localStorage.getItem(LS) || ''; } catch { return ''; } };

/** ⚙ → «Сон из Здоровья»: секретный токен и адрес для «Команд» на iPhone. */
export function SleepSettings({ notify }: { notify: (msg: string, err?: boolean) => void }) {
  const [token, setToken] = useState(read);
  const [busy, setBusy] = useState(false);
  const url = SUPABASE_URL + '/rest/v1/rpc/add_sleep_samples';

  const create = async () => {
    if (token && !confirm('Создать новый токен? Старый перестанет работать — в «Командах» нужно будет вставить новый.')) return;
    setBusy(true);
    try {
      const t = newSleepToken();
      await setSleepToken(t);
      try { localStorage.setItem(LS, t); } catch { /* покажем хотя бы сейчас */ }
      setToken(t);
      notify('Токен создан — вставь его в «Команды»');
    } catch (e) {
      notify(e instanceof CloudError ? e.message : 'Не получилось: ' + (e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const copy = (v: string, what: string) =>
    navigator.clipboard?.writeText(v).then(() => notify(what + ' скопирован'), () => notify('Не получилось скопировать — выдели и скопируй вручную', true));

  return (
    <div className="card">
      <div className="card-label">Сон из «Здоровья»</div>
      <div className="blk-b" style={{ marginBottom: 10 }}>
        Команда на iPhone каждое утро отправляет сон за ночь, приложение само кладёт его в нужный день. Ниже — три значения для «Команд».
      </div>
      {token ? (
        <>
          <Field l="1. Адрес (URL)" v={url} onCopy={() => copy(url, 'Адрес')} />
          <Field l="2. Ключ apikey (публичный)" v={SUPABASE_KEY} onCopy={() => copy(SUPABASE_KEY, 'Ключ')} />
          <Field l="3. Токен (секретный — никому не отправляй)" v={token} onCopy={() => copy(token, 'Токен')} />
          <button className="btn ghost full" onClick={create} disabled={busy}>{busy ? '…' : 'Создать новый токен'}</button>
        </>
      ) : (
        <button className="btn full" onClick={create} disabled={busy}>{busy ? '…' : 'Создать токен для «Команд»'}</button>
      )}
      <div className="sub-note">Токен хранится только на этом телефоне, на сервере — лишь его отпечаток. Если токен попал в чужие руки — создай новый.</div>
    </div>
  );
}

function Field({ l, v, onCopy }: { l: string; v: string; onCopy: () => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="blk-l">{l}</div>
      <div className="weight-row" style={{ marginBottom: 0 }}>
        <input className="inp" readOnly value={v} onFocus={e => e.target.select()} />
        <button className="btn ghost" onClick={onCopy}>Копировать</button>
      </div>
    </div>
  );
}
