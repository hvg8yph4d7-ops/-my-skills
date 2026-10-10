import { useEffect, useRef, useState } from 'react';
import type { FormaData } from '../types';
import { loadChat, loadUndo, saveChat, saveUndo, type Settings, type StoredTurn, type UndoSnap } from '../storage';
import { AiError, askAdvisor, hasKey, prepareAttachment, thumbnail, type Attachment } from '../lib/ai';
import { actionDetails, actionDiff, actionsNote, alreadyDone, applyAction, asksToDelete, isRemoval, type Action, type DiffRow } from '../lib/advice';

type Props = {
  data: FormaData;
  settings: Settings;
  today: string;
  update: (fn: (d: FormaData) => FormaData) => void;
  chatKey: string; // своя переписка или переписка о клиенте
  /** Своя переписка: подтянуть из аккаунта, если на телефоне пусто, и сохранять туда после каждого ответа. */
  sync?: { pull: () => Promise<StoredTurn[]>; push: (t: StoredTurn[]) => void };
  notify: (msg: string, err?: boolean) => void;
  openSettings: () => void;
};

const SUGGESTIONS = [
  'Что съесть вечером, чтобы добрать до цели?',
  'Что тренировать завтра?',
  'Как идёт прогресс по весу?',
  'Проверь дневник за неделю — есть ошибки?',
];

/**
 * Прокрутка переписки как в мессенджерах: при открытии — сразу к последнему сообщению,
 * при новом сообщении — плавно вниз (если читаешь старое — не дёргаем, кроме своих сообщений).
 * Возвращает, видно ли сейчас конец переписки.
 */
function useChatScroll(endRef: React.RefObject<HTMLDivElement | null>, count: number, always = false, busy = false) {
  const [atEnd, setAtEnd] = useState(true);
  const first = useRef(true);
  const endVisible = () => {
    const el = endRef.current;
    return !el || el.getBoundingClientRect().top <= window.innerHeight - 40;
  };
  useEffect(() => {
    const on = () => setAtEnd(endVisible());
    on();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const wasAtEnd = useRef(true);
  wasAtEnd.current = atEnd;
  useEffect(() => {
    if (!count) return;
    if (first.current) { first.current = false; toBottom('auto'); return; }
    if (always || wasAtEnd.current) toBottom('smooth');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, busy]);
  return atEnd;
}

/** В самый низ страницы: последнее сообщение оказывается над строкой ввода. */
const toBottom = (behavior: ScrollBehavior) => window.scrollTo({ top: document.documentElement.scrollHeight, behavior });

/** Круглая кнопка «вниз», когда листаешь старые сообщения. */
function ToEnd() {
  return <button className="to-end" aria-label="К последнему сообщению" onClick={() => toBottom('smooth')}>↓</button>;
}

const mark = (st?: string | null) =>
  st === 'applied' ? '✓ ' : st === 'skipped' ? '✗ ' : st === 'stale' ? '⌛ ' : st === 'undone' ? '↶ ' : '✎ ';

/** «Было → станет» построчно (для старых сообщений без сохранённого сравнения — что добавится). */
function Details({ a, diff }: { a: Action; diff?: DiffRow[] }) {
  if (diff) {
    if (!diff.length) return <div className="action-details">Ничего не изменится</div>;
    return (
      <div className="action-details">
        {diff.map((r, i) => (
          <div key={i} className="diff-row">
            {r.was != null && <div className="diff-was">было: {r.was}</div>}
            {r.now != null ? <div className="diff-now">станет: {r.now}</div> : <div className="diff-now gone">станет: (удалено)</div>}
          </div>
        ))}
      </div>
    );
  }
  const lines = actionDetails(a);
  if (!lines.length) return null;
  return <div className="action-details">{lines.map((l, i) => <div key={i} className={l.startsWith('Итого') ? 'total' : ''}>{l}</div>)}</div>;
}

/** Вложения в пузыре: превью фото или значок документа. */
function Files({ files }: { files: NonNullable<StoredTurn['files']> }) {
  return (
    <div className="att-row in-bubble">
      {files.map((f, i) => (
        <div key={i} className="att">
          {f.thumb ? <img src={f.thumb} alt={f.name} /> : <div className="att-doc">{f.kind === 'pdf' ? 'PDF' : f.kind === 'image' ? 'ФОТО' : 'TXT'}<span>{f.name}</span></div>}
        </div>
      ))}
    </div>
  );
}

/** Отпечаток дневника без служебных полей — чтобы понять, менялся ли он после правки. */
const fingerprint = (d: FormaData) => JSON.stringify({ ...d, updatedAt: undefined, ownerId: undefined });

/** Простое оформление ответа: **жирный** и списки «- …». */
export function Rich({ text }: { text: string }) {
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

export function Advisor({ data, settings, today, update, chatKey, sync, notify, openSettings }: Props) {
  const [turns, setTurns] = useState<StoredTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChat(chatKey).then(async local => {
      if (local.length || !sync) { setTurns(local); return; }
      const remote = await sync.pull().catch(() => []);
      setTurns(remote);
      if (remote.length) saveChat(remote, chatKey).catch(() => {});
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatKey]);
  const atEnd = useChatScroll(endRef, turns.length, true, busy);
  const [undo, setUndo] = useState<UndoSnap | null>(null);
  // Вложения к следующему сообщению: файл для ИИ + картинка-превью.
  const [files, setFiles] = useState<{ att: Attachment; thumb?: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const addFiles = async (list: FileList) => {
    for (const f of [...list].slice(0, 4 - files.length)) {
      try {
        const att = await prepareAttachment(f);
        const thumb = att.kind === 'image' ? await thumbnail(f) : undefined;
        setFiles(x => [...x, { att, thumb }].slice(0, 4));
      } catch (e) {
        notify((e as Error).message, true);
      }
    }
  };
  useEffect(() => { loadUndo(chatKey).then(setUndo).catch(() => {}); }, [chatKey]);
  const remember = (snap: UndoSnap | null) => { setUndo(snap); saveUndo(chatKey, snap).catch(() => {}); };

  const persist = (next: StoredTurn[]) => {
    setTurns(next);
    saveChat(next, chatKey).catch(() => {});
    sync?.push(next.slice(-60));
  };

  const send = async (typed: string) => {
    const atts = files;
    if ((!typed && !atts.length) || busy) return;
    if (!hasKey(settings)) { notify('Сначала вставь ключ ИИ в ⚙', true); openSettings(); return; }
    const q = typed || (atts.length > 1 ? 'Посмотри файлы' : 'Посмотри файл');
    const meta = atts.map(f => ({ name: f.att.name, kind: f.att.kind, thumb: f.thumb }));
    const withQ: StoredTurn[] = [...turns, { role: 'user', text: q, at: new Date().toISOString(), ...(meta.length ? { files: meta } : {}) }];
    setTurns(withQ); setText(''); setFiles([]); setBusy(true);
    try {
      const last = withQ.length - 1;
      // Файлы уходят в ИИ только с этим сообщением; у старых — только названия.
      const history = withQ.map((t, i) => ({
        role: t.role,
        text: t.text + (i !== last && t.files?.length ? `\n[было прикреплено: ${t.files.map(f => f.name).join(', ')}]` : '') + (t.actions?.length ? actionsNote(t.actions, t.status) : ''),
        ...(i === last && atts.length ? { files: atts.map(f => f.att) } : {}),
      }));
      const a = await askAdvisor({ settings, data, today, history });
      a.actions = a.actions.filter(x => !alreadyDone(data, x));
      // Удалять целиком — только если пользователь прямо написал «удали». Иначе такие предложения не показываем.
      const blocked = asksToDelete(q) ? [] : a.actions.filter(x => isRemoval(data, x));
      if (blocked.length) {
        const rest = a.actions.filter(x => !blocked.includes(x));
        const what = blocked.map(x => x.summary).join('; ');
        // Всё предложенное — удаление: ответ ИИ («удаляю…») больше не верен, вместо него переспрашиваем.
        a.reply = rest.length
          ? a.reply + `\n\nУдалять не предлагаю (${what}). Если нужно именно удалить — напиши прямо: «удали …».`
          : `Не до конца понял, что сделать. Советник хотел удалить: ${what}.\n- Если нужно только поправить текст (например, убрать приписку) — напиши, что именно убрать, упражнения и записи останутся.\n- Если нужно удалить целиком — напиши прямо: «удали …».`;
        a.actions = rest;
      }
      // Пришли новые предложения — старые нерешённые больше не показываем с кнопками, чтобы не применить дважды.
      const prev = a.actions.length
        ? withQ.map(t => (t.actions?.some((_, j) => !t.status?.[j]) ? { ...t, status: t.actions.map((_, j) => t.status?.[j] ?? 'stale' as const) } : t))
        : withQ;
      persist([...prev, { role: 'assistant', text: a.reply, at: new Date().toISOString(), actions: a.actions, status: a.actions.map(() => null), diffs: a.actions.map(x => actionDiff(data, x)) }]);
    } catch (e) {
      // Вопрос без ответа убираем, текст возвращаем в поле — можно отправить ещё раз.
      setTurns(turns); setText(typed); setFiles(atts);
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
      const after = applyAction(data, action);
      update(() => after);
      remember({ label: action.summary, before: data, after: fingerprint(after), turn: ti, actions: [ai] });
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
    if (ok) remember({ label: `${ok} изм.: ${t.actions!.filter((_, j) => status[j] === 'applied' && !t.status?.[j]).map(a => a.summary).join('; ')}`, before: data, after: fingerprint(result), turn: ti, actions: status.map((s, j) => (s === 'applied' && !t.status?.[j] ? j : -1)).filter(j => j >= 0) });
    persist(turns.map((x, i) => (i === ti ? { ...x, status } : x)));
    notify(`Применено изменений: ${ok}`);
  };

  // Отмена последней правки: возвращаем дневник к снимку до неё.
  const undoLast = () => {
    if (!undo) return;
    if (fingerprint(data) !== undo.after && !confirm('После этой правки дневник ещё менялся — эти изменения тоже откатятся. Всё равно отменить?')) return;
    const before = { ...undo.before, ownerId: data.ownerId };
    update(() => before);
    persist(turns.map((x, i) => (i === undo.turn && x.status ? { ...x, status: x.status.map((s, j) => (undo.actions.includes(j) ? 'undone' : s)) } : x)));
    remember(null);
    notify('Отменено: ' + undo.label);
  };

  return (
    <>
      {turns.length === 0 && <div className="card">
        <div className="card-label">Советник</div>
        <div className="blk-b">Спроси что угодно про еду, тренировки и восстановление — или попроси что-то поправить в дневнике. Советник видит дневник за 2 недели, вес, жим и цели. Изменения он только предлагает — применяешь ты.</div>
        <div className="chip-row" style={{ marginTop: 12, marginBottom: 0 }}>
          {SUGGESTIONS.map(s => <button key={s} className="tag sugg" onClick={() => send(s)} disabled={busy}>{s}</button>)}
        </div>
        <div className="sub-note" style={{ marginBottom: 0 }}>Очистить переписку можно в ⚙.</div>
      </div>}

      <div className="chat">
        {turns.map((t, i) => (
          <div key={i} className={'bubble ' + t.role}>
            {!!t.files?.length && <Files files={t.files} />}
            {t.role === 'assistant' ? <Rich text={t.text} /> : t.text}
            {!!t.actions?.length && (
              <div className="actions">
                {t.actions.map((a, j) => {
                  const st = t.status?.[j];
                  return (
                    <div key={j} className={'action' + (st ? ' done' : '')}>
                      <div className="action-text">{mark(st)}{a.summary}</div>
                      <Details a={a} diff={t.diffs?.[j]} />
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

      {undo && <div style={{ height: 44 }} />}
      {!atEnd && <ToEnd />}
      <div className="entry-bar">
        {undo && !busy && <button className="undo-btn" onClick={undoLast}>↶ Отменить правку <span>{undo.label}</span></button>}
        {files.length > 0 && (
          <div className="att-row">
            {files.map((f, i) => (
              <div key={i} className="att">
                {f.thumb ? <img src={f.thumb} alt="" /> : <div className="att-doc">{f.att.kind === 'pdf' ? 'PDF' : 'TXT'}<span>{f.att.name}</span></div>}
                <button onClick={() => setFiles(x => x.filter((_, j) => j !== i))} aria-label="Убрать файл">×</button>
              </div>
            ))}
          </div>
        )}
        <form className="entry-row" onSubmit={ev => { ev.preventDefault(); send(text.trim()); }}>
          <button type="button" className="icon-btn" aria-label="Прикрепить фото или файл" onClick={() => fileRef.current?.click()} disabled={busy || files.length >= 4}>📎</button>
          <input ref={fileRef} type="file" multiple hidden accept="image/*,application/pdf,.pdf,.txt,.csv,.tsv,.json,.md,text/*"
            onChange={e => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }} />
          <textarea className="inp entry-inp" rows={1} placeholder={busy ? 'Советник думает…' : 'Спроси или поправь…'}
            value={text} disabled={busy} onChange={e => setText(e.target.value)} />
          <button className="btn" type="submit" disabled={busy || (!text.trim() && !files.length)}>{busy ? '…' : '➤'}</button>
        </form>
      </div>
    </>
  );
}

/** Переписка клиента с его советником — у тренера, только чтение, обновляется сама. */
export function ClientChat({ name, pull }: { name: string; pull: () => Promise<StoredTurn[]> }) {
  const [turns, setTurns] = useState<StoredTurn[] | null>(null);
  const [err, setErr] = useState('');
  const [at, setAt] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const atEnd = useChatScroll(endRef, turns?.length ?? 0);

  useEffect(() => {
    let alive = true;
    const load = () => pull()
      .then(t => { if (alive) { setTurns(t); setErr(''); setAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })); } })
      .catch(e => { if (alive) setErr((e as Error).message); });
    load();
    const id = setInterval(load, 20_000);
    return () => { alive = false; clearInterval(id); };
  }, [pull]);

  return (
    <>
      <div className="sub-note" style={{ marginBottom: 10 }}>
        Переписка {name} с советником — только чтение, обновляется сама каждые 20 секунд{at ? ` · обновлено в ${at}` : ''}.
      </div>
      {err && <div className="card"><div className="empty">{err}</div></div>}
      {turns === null && !err && <div className="empty">Загружаю…</div>}
      {turns?.length === 0 && <div className="card"><div className="empty">{name} пока ничего не писал советнику.</div></div>}
      <div className="chat">
        {turns?.map((t, i) => (
          <div key={i} className={'bubble ' + t.role}>
            <div className="chat-time">{new Date(t.at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            {!!t.files?.length && <Files files={t.files} />}
            {t.role === 'assistant' ? <Rich text={t.text} /> : t.text}
            {!!t.actions?.length && (
              <div className="actions">
                {t.actions.map((a, j) => {
                  const st = t.status?.[j];
                  return <div key={j} className="action done"><div className="action-text">{st ? mark(st) : '… '}{a.summary}</div><Details a={a} diff={t.diffs?.[j]} /></div>;
                })}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {!atEnd && <ToEnd />}
    </>
  );
}
