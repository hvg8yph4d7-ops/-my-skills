import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CloudError, addCoach, cloudEnabled, listClients, listCoaches, removeCoach, signIn, signOut, signUp, type Client } from '../lib/cloud';
import type { SyncState } from '../App';

type Notify = (msg: string, err?: boolean) => void;
const errText = (e: unknown) => (e instanceof CloudError ? e.message : 'Ошибка: ' + (e as Error).message);

/** Форма входа / регистрации. Используется в ⚙ и в анкете первого запуска. */
export function LoginForm({ notify }: { notify: Notify }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (kind: 'in' | 'up') => {
    if (!email.trim() || !pass) { notify('Введи почту и пароль', true); return; }
    setBusy(true);
    try {
      if (kind === 'in') { await signIn(email, pass); notify('Вход выполнен'); }
      else {
        const r = await signUp(email, pass);
        notify(r.needConfirm ? 'Аккаунт создан. Подтверди почту по ссылке из письма и войди.' : 'Аккаунт создан');
      }
    } catch (e) { notify(errText(e), true); }
    finally { setBusy(false); }
  };

  return (
    <>
      <input className="inp full" type="email" autoComplete="email" placeholder="Почта" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="inp full" type="password" autoComplete="current-password" placeholder="Пароль (минимум 6 символов)" value={pass} onChange={e => setPass(e.target.value)} />
      <div className="detail-marks">
        <button className="btn" style={{ flex: 1 }} disabled={busy} onClick={() => run('in')}>{busy ? '…' : 'Войти'}</button>
        <button className="btn ghost" style={{ flex: 1 }} disabled={busy} onClick={() => run('up')}>Создать аккаунт</button>
      </div>
    </>
  );
}

type Props = { session: Session | null; sync: SyncState; notify: Notify; openClient: (userId: string) => void };

/** Аккаунт: вход, синхронизация, доступ тренеру, список клиентов. */
export function AccountSettings({ session, sync, notify, openClient }: Props) {
  const [coaches, setCoaches] = useState<string[]>([]);
  const [clients, setClients] = useState<Client[] | null>(null);
  const [coachEmail, setCoachEmail] = useState('');
  const uid = session?.user.id;

  const refreshClients = () => {
    if (!uid) return;
    setClients(null);
    listClients(uid).then(setClients).catch(e => { setClients([]); notify(errText(e), true); });
  };

  useEffect(() => {
    if (!uid) return;
    listCoaches(uid).then(setCoaches).catch(e => notify(errText(e), true));
    listClients(uid).then(setClients).catch(e => { setClients([]); notify(errText(e), true); });
  }, [uid, notify]);

  if (!cloudEnabled) return null;

  if (!session) {
    return (
      <div className="card">
        <div className="card-label">Аккаунт</div>
        <div className="blk-b" style={{ marginBottom: 12 }}>
          Войди, чтобы дневник хранился онлайн: его можно открыть с любого телефона, а тренер сможет его смотреть. Дневник с этого телефона загрузится в аккаунт.
        </div>
        <LoginForm notify={notify} />
      </div>
    );
  }

  const give = async () => {
    const e = coachEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) { notify('Проверь почту тренера', true); return; }
    if (e === session.user.email?.toLowerCase()) { notify('Это твоя же почта', true); return; }
    try { await addCoach(uid!, e); setCoaches(c => [...new Set([...c, e])]); setCoachEmail(''); notify('Доступ выдан: ' + e); }
    catch (err) { notify(errText(err), true); }
  };

  const revoke = async (e: string) => {
    if (!confirm(`Забрать доступ у ${e}?`)) return;
    try { await removeCoach(uid!, e); setCoaches(c => c.filter(x => x !== e)); }
    catch (err) { notify(errText(err), true); }
  };

  const syncText = { off: '', ok: '✓ Дневник сохранён в аккаунте', saving: '⟳ Сохраняю…', error: '⚠ Не получилось сохранить — проверь интернет/VPN, попробую ещё при следующем изменении' }[sync];

  return (
    <>
      <div className="card">
        <div className="card-label">Аккаунт</div>
        <div className="blk-b">Вход: <b>{session.user.email}</b></div>
        <div className="sub-note" style={{ marginBottom: 12 }}>{syncText}</div>
        <button className="btn ghost full" onClick={() => { if (confirm('Выйти из аккаунта? Дневник останется на этом телефоне.')) signOut(); }}>Выйти из аккаунта</button>
      </div>

      <div className="card">
        <div className="card-label">Доступ тренеру</div>
        <div className="blk-b" style={{ marginBottom: 12 }}>Тренер сможет смотреть и исправлять твой дневник. Впиши почту, с которой он входит в «Форму».</div>
        {coaches.map(c => (
          <div key={c} className="list-row"><div>{c}</div><button className="del-btn" aria-label="Забрать доступ" onClick={() => revoke(c)}>×</button></div>
        ))}
        <form className="weight-row" onSubmit={ev => { ev.preventDefault(); give(); }}>
          <input className="inp" type="email" placeholder="Почта тренера" value={coachEmail} onChange={e => setCoachEmail(e.target.value)} />
          <button className="btn" type="submit">Дать доступ</button>
        </form>
      </div>

      <div className="card">
        <div className="card-label">Мои клиенты</div>
        {clients === null && <div className="empty">Загружаю…</div>}
        {clients?.length === 0 && (
          <div className="blk-b" style={{ marginBottom: 12 }}>
            Пока никого. Пусть друг войдёт в свой аккаунт и в ⚙ → «Доступ тренеру» впишет твою почту: <b>{session.user.email}</b>
          </div>
        )}
        {clients?.map(c => (
          <div key={c.userId} className="list-row">
            <div>{c.name}<div className="meta">{c.email} · обновлён {new Date(c.updatedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div></div>
            <button className="btn" onClick={() => openClient(c.userId)}>Открыть</button>
          </div>
        ))}
        <button className="btn ghost full" style={{ marginTop: 10, marginBottom: 0 }} onClick={refreshClients}>Обновить список</button>
      </div>
    </>
  );
}
