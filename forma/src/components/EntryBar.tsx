import { useRef, useState } from 'react';
import type { FormaData } from '../types';
import type { Settings } from '../storage';
import { ClaudeError, parseEntry, prepareImage, type Entry, type ImageInput } from '../lib/claude';
import { applyEntry, entryHasData, scaleFood, type EntryExercise, type EntryFood } from '../lib/entry';
import { groupOf } from '../lib/calc';
import { longD, num } from '../lib/format';

type Props = {
  data: FormaData;
  settings: Settings;
  today: string;
  update: (fn: (d: FormaData) => FormaData) => void;
  notify: (msg: string, err?: boolean) => void;
  openSettings: () => void;
};

const SOURCE = { label: 'этикетка', base: 'справочник', estimate: 'оценка' };

/** Поле «что ел / что делал» внизу экрана + карточка подтверждения. */
export function EntryBar({ data, settings, today, update, notify, openSettings }: Props) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ input: ImageInput; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{ entry: Entry; text: string; image: ImageInput | null } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (msg: string, img: ImageInput | null) => {
    if (!settings.apiKey) { notify('Сначала вставь ключ Claude API в ⚙', true); openSettings(); return; }
    setBusy(true);
    try {
      const entry = await parseEntry({ settings, data, today, text: msg, image: img ?? undefined });
      setDraft({ entry, text: msg, image: img });
      setText(''); setImage(null);
    } catch (e) {
      notify(e instanceof ClaudeError ? e.message : 'Что-то пошло не так: ' + (e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async (f: File) => {
    try {
      const input = await prepareImage(f);
      setImage({ input, preview: 'data:image/jpeg;base64,' + input.data });
    } catch {
      notify('Не получилось открыть фото', true);
    }
  };

  const canSend = !busy && (text.trim() || image);

  return (
    <>
      <div className="entry-bar">
        {image && (
          <div className="entry-photo">
            <img src={image.preview} alt="" />
            <button onClick={() => setImage(null)} aria-label="Убрать фото">×</button>
          </div>
        )}
        <form className="entry-row" onSubmit={ev => { ev.preventDefault(); if (canSend) run(text.trim(), image?.input ?? null); }}>
          <button type="button" className="icon-btn" aria-label="Фото" onClick={() => fileRef.current?.click()} disabled={busy}>📷</button>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) pickPhoto(f); e.target.value = ''; }} />
          <textarea className="inp entry-inp" rows={1} placeholder={busy ? 'Claude разбирает…' : 'Что ел / что делал…'}
            value={text} disabled={busy} onChange={e => setText(e.target.value)} />
          <button className="btn" type="submit" disabled={!canSend}>{busy ? '…' : '➤'}</button>
        </form>
      </div>
      {draft && (
        <EntrySheet key={JSON.stringify(draft.entry)} draft={draft} busy={busy}
          onCancel={() => setDraft(null)}
          onClarify={answer => run(`${draft.text}\nУточнение: ${answer}`, draft.image)}
          onSave={(food, ex) => {
            update(d => applyEntry(d, draft.entry, food, ex));
            notify('Записано в ' + longD(draft.entry.date));
            setDraft(null);
          }} />
      )}
    </>
  );
}

type SheetProps = {
  draft: { entry: Entry };
  busy: boolean;
  onCancel: () => void;
  onClarify: (answer: string) => void;
  onSave: (food: EntryFood[], ex: EntryExercise[]) => void;
};

function EntrySheet({ draft, busy, onCancel, onClarify, onSave }: SheetProps) {
  const e = draft.entry;
  const [food, setFood] = useState(e.food.map(f => ({ on: true, item: f })));
  const [ex, setEx] = useState(e.exercises.map(x => ({ on: true, item: x })));
  const [answer, setAnswer] = useState('');

  const chosen = food.filter(x => x.on).map(x => x.item);
  const total = chosen.reduce((a, x) => ({ p: a.p + x.p, f: a.f + x.f, c: a.c + x.c, kcal: a.kcal + x.kcal }), { p: 0, f: 0, c: 0, kcal: 0 });
  const nothing = !entryHasData({ ...e, food: chosen, exercises: ex.filter(x => x.on).map(x => x.item) });

  const setGrams = (i: number, v: string) => {
    const g = parseFloat(v.replace(',', '.'));
    if (!(g > 0)) return;
    setFood(fs => fs.map((x, j) => (j === i ? { ...x, item: scaleFood(x.item, Math.round(g)) } : x)));
  };

  return (
    <div className="sheet-back" onClick={onCancel}>
      <div className="sheet" onClick={ev => ev.stopPropagation()}>
        <div className="detail-date">Проверь запись</div>
        <div className="detail-wd">{longD(e.date)} · нажми на строку, чтобы не записывать её</div>

        {e.comment && <div className="verdict" style={{ marginBottom: 12 }}>{e.comment}</div>}

        {food.length > 0 && (
          <div className="blk">
            <div className="blk-l">Еда</div>
            {food.map((x, i) => (
              <div key={i} className={'pick' + (x.on ? '' : ' off')}>
                <button className="pick-main" onClick={() => setFood(fs => fs.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))}>
                  <span className="pick-check">{x.on ? '✓' : ''}</span>
                  <span>
                    <span className="pick-name">{x.item.name}</span>
                    <span className="meta">Б {x.item.p} · Ж {x.item.f} · У {x.item.c} · {x.item.kcal} ккал · клетч. {x.item.fib} · {SOURCE[x.item.source]}{x.item.note ? ' · ' + x.item.note : ''}</span>
                  </span>
                </button>
                {x.item.grams != null && (
                  <label className="grams">
                    <input className="inp" inputMode="decimal" defaultValue={x.item.grams} onBlur={ev => setGrams(i, ev.target.value)} />г
                  </label>
                )}
              </div>
            ))}
            <div className="sub-note">Итого: Б {total.p} · Ж {total.f} · У {total.c} · {total.kcal} ккал. Поменяй граммы — КБЖУ пересчитаются.</div>
          </div>
        )}

        {ex.length > 0 && (
          <div className="blk">
            <div className="blk-l">Тренировка</div>
            {ex.map((x, i) => {
              const g = x.item.group ? groupOf(x.item.group) : null;
              return (
                <div key={i} className={'pick' + (x.on ? '' : ' off')}>
                  <button className="pick-main" onClick={() => setEx(xs => xs.map((y, j) => (j === i ? { ...y, on: !y.on } : y)))}>
                    <span className="pick-check">{x.on ? '✓' : ''}</span>
                    <span>
                      <span className="pick-name">{x.item.name}{x.item.isBench && <span className="pr-badge">ЖИМ</span>}</span>
                      <span className="meta">
                        {g ? g.l + ' · ' : ''}
                        {x.item.sets.map(s => (s.weight != null ? `${num(s.weight)}×${s.reps}` : `${s.reps} повт.`)).join(', ') || 'подходы не указаны'}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {(e.weight != null || e.supps || e.gym || e.sore.length > 0) && (
          <div className="blk">
            <div className="blk-l">Отметки</div>
            <div className="chip-row">
              {e.weight != null && <span className="tag">Вес {num(e.weight)} кг</span>}
              {e.supps && <span className="tag">✓ Добавки</span>}
              {e.gym && <span className="tag">✓ Зал</span>}
              {e.sore.map(s => <span key={s} className="tag">Болит: {s}</span>)}
            </div>
          </div>
        )}

        {e.questions.length > 0 && (
          <div className="blk">
            <div className="blk-l">Claude уточняет</div>
            <ul className="questions">{e.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            <form className="weight-row" onSubmit={ev => { ev.preventDefault(); if (answer.trim()) onClarify(answer.trim()); }}>
              <input className="inp" placeholder="Ответ, например «сухие»" value={answer} onChange={ev => setAnswer(ev.target.value)} disabled={busy} />
              <button className="btn ghost" type="submit" disabled={busy || !answer.trim()}>{busy ? '…' : 'Уточнить'}</button>
            </form>
            <div className="sub-note">Можно и не отвечать — тогда запишется как есть.</div>
          </div>
        )}

        {nothing && <div className="empty">Claude не нашёл, что записать. Попробуй написать подробнее.</div>}

        <div className="sheet-actions">
          <button className="btn ghost" onClick={onCancel}>Отмена</button>
          <button className="btn" disabled={nothing || busy}
            onClick={() => onSave(chosen, ex.filter(x => x.on).map(x => x.item))}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
