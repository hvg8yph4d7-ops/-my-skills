import { useMemo, useState } from 'react';
import type { FormaData } from '../types';
import { GROUPS } from '../lib/calc';
import { num, shortD } from '../lib/format';
import { BENCH, DEFAULT_ALIASES, aliasesOf, aliasesToText, progressList, setsText, textToAliases, type Progress as P } from '../lib/exercises';
import { Chart } from './common';

type Props = { data: FormaData; update: (fn: (d: FormaData) => FormaData) => void; notify: (msg: string, err?: boolean) => void };

const ORDER = [...GROUPS.map(g => g.k), null];
const unitOf = (p: P) => (p.by === 'reps' ? 'повт.' : 'кг');
const metricTxt = (p: P, v: number | null) => (v == null ? '' : p.by === 'reps' ? `${v} повт.` : p.by === 'e1rm' ? `расч. макс ${num(v)} кг` : `${num(v)} кг`);

/** Вкладка «Прогресс»: все упражнения по мышцам → страница упражнения с графиком и историей. */
export function Progress({ data, update, notify }: Props) {
  const list = useMemo(() => progressList(data), [data]);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const cur = list.find(p => p.key === open);

  if (cur) return <ExercisePage p={cur} data={data} back={() => { setOpen(null); window.scrollTo(0, 0); }} />;

  return (
    <>
      {!list.length && <div className="card"><div className="empty">Упражнений пока нет — запиши тренировку внизу или советнику.</div></div>}
      {ORDER.map(g => {
        const items = list.filter(p => p.group === g).sort((a, b) => b.last.date.localeCompare(a.last.date));
        if (!items.length) return null;
        const meta = GROUPS.find(x => x.k === g);
        return (
          <div className="card" key={g ?? 'none'}>
            <div className="card-label">{meta ? meta.l : 'Без группы'}</div>
            {items.map(p => (
              <button className="prog-row" key={p.key} onClick={() => { setOpen(p.key); window.scrollTo(0, 0); }}>
                <div className="prog-main">
                  <div className="prog-name">{p.name}</div>
                  <div className="meta">
                    {shortD(p.last.date)} · {setsText(p.last.sets) || 'вес не записан'}
                  </div>
                  {p.best && (
                    <div className="meta">
                      лучший: {setsText(p.best.sets)}{p.best !== p.last ? ` · ${shortD(p.best.date)}` : ''}
                      <span className="pr-badge">РЕКОРД</span>
                    </div>
                  )}
                </div>
                {p.trend && <div className={'prog-trend ' + (p.trend === '↑' ? 'up' : p.trend === '↓' ? 'down' : '')}>{p.trend}</div>}
              </button>
            ))}
          </div>
        );
      })}

      <div className="card">
        <div className="card-label">Названия упражнений</div>
        {!editing ? (
          <>
            <div className="blk-b">Разные написания одного упражнения («жим лёжа», «жим штанги») собираются в одно. Список можно поправить.</div>
            <button className="btn ghost full" style={{ marginTop: 10 }} onClick={() => setEditing(true)}>Редактировать синонимы</button>
          </>
        ) : <AliasEditor data={data} update={update} notify={notify} close={() => setEditing(false)} />}
      </div>
    </>
  );
}

function ExercisePage({ p, data, back }: { p: P; data: FormaData; back: () => void }) {
  const points = p.sessions.filter(s => s.metric != null).map(s => ({ date: s.date, v: s.metric! }));
  const target = p.name === BENCH && data.oldBenchMax ? { v: data.oldBenchMax, label: `цель ${num(data.oldBenchMax)} кг` } : undefined;
  const what = p.by === 'e1rm' ? 'расчётный максимум (Эпли: вес × (1 + повторы / 30))' : p.by === 'reps' ? 'повторы (упражнение со своим весом)' : p.by === 'weight' ? 'рабочий вес (повторы не записаны)' : '';
  return (
    <>
      <button className="btn ghost" onClick={back} style={{ marginBottom: 12 }}>← Все упражнения</button>
      <div className="card">
        <div className="card-label">{GROUPS.find(g => g.k === p.group)?.l ?? 'Без группы'}</div>
        <div className="detail-date">{p.name}</div>
        <div className="row2" style={{ marginTop: 12 }}>
          <div>
            <div className="blk-l">Последний раз · {shortD(p.last.date)}</div>
            <div className="blk-b">{setsText(p.last.sets) || 'вес не записан'}{p.trend ? ` ${p.trend}` : ''}</div>
          </div>
          <div>
            <div className="blk-l">Рекорд{p.best ? ` · ${shortD(p.best.date)}` : ''}</div>
            <div className="blk-b">{p.best ? metricTxt(p, p.best.metric) : '—'}</div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-label">Прогресс</div>
        {p.by ? <Chart id={'ex' + [...p.key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)} points={points} unit={unitOf(p)} target={target} /> : <div className="empty">Вес не записан — графика нет. Пиши вес и повторы, например «махи 10 кг на 12».</div>}
        {what && <div className="sub-note">По графику: {what}.</div>}
        {p.name === BENCH && !!data.benchMax && <div className="sub-note">Текущий примерный максимум — {num(data.benchMax)} кг.</div>}
      </div>
      <div className="card">
        <div className="card-label">История подходов</div>
        {p.sessions.slice().reverse().map(s => (
          <div className="list-row" key={s.date}>
            <div>
              {shortD(s.date)}
              <div className="meta">{setsText(s.sets) || 'вес не записан'}</div>
            </div>
            <div className="val">{metricTxt(p, s.metric)}{s === p.best && <span className="pr-badge">РЕКОРД</span>}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function AliasEditor({ data, update, notify, close }: { data: FormaData; update: Props['update']; notify: Props['notify']; close: () => void }) {
  const [text, setText] = useState(aliasesToText(aliasesOf(data)));
  const save = () => {
    try {
      const list = textToAliases(text);
      update(d => ({ ...d, exerciseAliases: list }));
      notify('Названия сохранены');
      close();
    } catch (e) {
      notify('Не сохранено: ' + (e as Error).message, true);
    }
  };
  return (
    <>
      <div className="sub-note" style={{ marginTop: 0 }}>Формат строки: <b>группа | Название = вариант, вариант</b>. Звёздочка после названия — упражнение со своим весом (прогресс по повторам).</div>
      <textarea className="inp full alias-edit" rows={14} value={text} onChange={e => setText(e.target.value)} />
      <div className="btn-col">
        <button className="btn" onClick={save}>Сохранить</button>
        <button className="btn ghost" onClick={() => setText(aliasesToText(DEFAULT_ALIASES))}>Вернуть стандартный список</button>
        <button className="btn ghost" onClick={close}>Отмена</button>
      </div>
    </>
  );
}
