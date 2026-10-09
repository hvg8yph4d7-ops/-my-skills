import { useEffect, useRef, useState } from 'react';
import type { FormaData } from '../types';
import { loadChat, saveChat, type Settings, type StoredTurn } from '../storage';
import { AiError, askAdvisor, hasKey } from '../lib/ai';
import { applyAction } from '../lib/advice';

type Props = {
  data: FormaData;
  settings: Settings;
  today: string;
  update: (fn: (d: FormaData) => FormaData) => void;
  chatKey: string; // своя переписка или переписка о клиенте
  notify: (msg: string, err?: boolean) => void;
  openSettings: () => void;
};

const SUGGESTIONS = [
  'Что съесть вечером, чтобы добрать до цели?',
  'Что тренировать завтра?',
  'Как идёт прогресс по весу?',
  'Проверь дневник за неделю — есть ошибки?',
];

/** Простое оформление ответа: **жирный** и списки «- …». */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const body = line.replace(/^\s*[-*•]\s+/, '').replace(/^#+\s*/, '');
        const parts = body.split(/\*\*(.+?)\*\*/g).map((p, j) => (j % 2 ? <b key={j}>{p}</b> : p));
        if (!body.trim()) return <div key={i} style={{ height: 6 }} />;
        return <div key={i} className={bullet ? 'chat-li' : ''}>{parts}</div>;
      })}
    </>
  );
}

export function Advisor({ data, settings, today, update, chatKey, notify, openSettings }: Props) {
  const [turns, setTurns] = useState<StoredTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadChat(chatKey).then(setTurns).catch(() => {}); }, [chatKey]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [turns.length, busy]);

  const persist = (next: StoredTurn[]) => { setTurns(next); saveChat(next, chatKey).catch(() => {}); };

  const send = async (q: string) => {
    if (!q || busy) return;
    if (!hasKey(settings)) { notify('Сначала вставь ключ ИИ в ⚙', true); openSettings(); return; }
    const withQ: StoredTurn[] = [...turns, { role: 'user', text: q, at: new Date().toISOString() }];
    setTurns(withQ); setText(''); setBusy(true);
    try {
      const a = await askAdvisor({ settings, data, today, history: withQ.map(({ role, text }) => ({ role, text })) });
      persist([...withQ, { role: 'assistant', text: a.reply, at: new Date().toISOString(), actions: a.actions, status: a.actions.map(() => null) }]);
    } catch (e) {
      // Вопрос без ответа убираем, текст возвращаем в поле — можно отправить ещё раз.
      setTurns(turns); setText(q);
      notify(e instanceof AiError ? e.message : 'Что-то пошло не так: ' + (e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const decide = (ti: number, ai: number, apply: boolean) => {
    const t = turns[ti], action = t.actions![ai];
    if (apply) {
      try {
        applyAction(data, action); // проверка до записи: некорректное действие не трогает дневник
      } catch (e) {
        notify('Не получилось: ' + (e as Error).message, true);
        return;
      }
      update(d => applyAction(d, action));
      notify('Готово: ' + action.summary);
    }
    persist(turns.map((x, i) => (i === ti ? { ...x, status: x.actions!.map((_, j) => (j === ai ? (apply ? 'applied' : 'skipped') : x.status?.[j] ?? null)) } : x)));
  };

  const applyAll = (ti: number) => {
    const t = turns[ti];
    let d = data, ok = 0;
    const status = t.actions!.map((a, j) => {
      if (t.status?.[j]) return t.status[j];
      try { d = applyAction(d, a); ok++; return 'applied' as const; } catch { return null; }
    });
    const result = d;
    update(() => result);
    persist(turns.map((x, i) => (i === ti ? { ...x, status } : x)));
    notify(`Применено изменений: ${ok}`);
  };

  const clear = () => {
    if (!confirm('Очистить переписку с советником?')) return;
    persist([]);
  };

  return (
    <>
      <div className="card">
        <div className="card-label">Советник</div>
        <div className="blk-b">Спроси что угодно про еду, тренировки и восстановление — или попроси что-то поправить в дневнике. Советник видит дневник за 2 недели, вес, жим и цели. Изменения он только предлагает — применяешь ты.</div>
        {turns.length === 0 && (
          <div className="chip-row" style={{ marginTop: 12, marginBottom: 0 }}>
            {SUGGESTIONS.map(s => <button key={s} className="tag sugg" onClick={() => send(s)} disabled={busy}>{s}</button>)}
          </div>
        )}
      </div>

      <div className="chat">
        {turns.map((t, i) => (
          <div key={i} className={'bubble ' + t.role}>
            {t.role === 'assistant' ? <Rich text={t.text} /> : t.text}
            {!!t.actions?.length && (
              <div className="actions">
                {t.actions.map((a, j) => {
                  const st = t.status?.[j];
                  return (
                    <div key={j} className={'action' + (st ? ' done' : '')}>
                      <div className="action-text">{st === 'applied' ? '✓ ' : st === 'skipped' ? '✗ ' : '✎ '}{a.summary}</div>
                      {!st && (
                        <div className="action-btns">
                          <button className="btn" onClick={() => decide(i, j, true)}>Применить</button>
                          <button className="btn ghost" onClick={() => decide(i, j, false)}>Пропустить</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {t.actions.filter((_, j) => !t.status?.[j]).length > 1 && (
                  <button className="btn full" style={{ marginTop: 6, marginBottom: 0 }} onClick={() => applyAll(i)}>Применить всё</button>
                )}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble assistant dim">Думаю…</div>}
        <div ref={endRef} />
      </div>
      {turns.length > 0 && <button className="btn ghost" style={{ width: '100%', marginTop: 4 }} onClick={clear}>Очистить переписку</button>}

      <div className="entry-bar">
        <form className="entry-row" onSubmit={ev => { ev.preventDefault(); send(text.trim()); }}>
          <textarea className="inp entry-inp" rows={1} placeholder={busy ? 'Советник думает…' : 'Спроси или попроси поправить…'}
            value={text} disabled={busy} onChange={e => setText(e.target.value)} />
          <button className="btn" type="submit" disabled={busy || !text.trim()}>{busy ? '…' : '➤'}</button>
        </form>
      </div>
    </>
  );
}
