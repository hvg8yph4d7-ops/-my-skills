import { useState } from 'react';
import type { FormaData } from '../types';
import { GROUPS, dayFor, groupOf, marksFor, planDays } from '../lib/calc';
import { MONTHS, WD, dk, longD, num, wdName } from '../lib/format';
import { Blk, Chip, DayBody } from './common';
import type { Settings } from '../storage';
import { AiError, dayVerdict, hasKey } from '../lib/ai';
import { removeExercise, removeMeal } from '../lib/entry';

type Update = (fn: (d: FormaData) => FormaData) => void;
type Ai = { settings: Settings; notify: (msg: string, err?: boolean) => void };

function GrpBadges({ data, k }: { data: FormaData; k: string }) {
  const e = dayFor(data, k);
  if (!e?.groups?.length) return null;
  const all = e.groups.map(groupOf).filter(g => !!g);
  const big = all.filter(g => g.big);
  const show = big.length ? big : all;
  return (
    <div className="grp-row">
      {show.slice(0, 3).map(g => <span key={g.k} className="grp" style={{ background: g.c }}>{g.s}</span>)}
    </div>
  );
}

export function Calendar({ data, today, update, ai }: { data: FormaData; today: string; update: Update; ai: Ai }) {
  const [view, setView] = useState(() => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() }; });
  const [selected, setSelected] = useState(today);
  const plan = planDays(data);

  const changeMonth = (d: number) => setView(v => {
    let m = v.m + d, y = v.y;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    return { y, m };
  });

  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const dim = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(<div key={'e' + i} className="day-cell empty-cell" />);
  for (let d = 1; d <= dim; d++) {
    const k = dk(view.y, view.m, d), m = marksFor(data, k);
    cells.push(
      <button key={k} className={'day-cell' + (k === today ? ' today' : '') + (k === selected ? ' selected' : '')} onClick={() => setSelected(k)}>
        <div className="day-num">{d}</div>
        <div className="dot-row"><div className={'dot pill' + (m.p ? ' on' : '')} /><div className={'dot gym' + (m.g ? ' on' : '')} /></div>
        <GrpBadges data={data} k={k} />
        {!dayFor(data, k)?.groups?.length && <div className="grp-row">{dayFor(data, k) && <div className="mini-tick" />}</div>}
      </button>,
    );
  }

  return (
    <>
      <div className="card">
        <div className="cal-header">
          <button className="nav-btn" onClick={() => changeMonth(-1)} aria-label="Предыдущий месяц">‹</button>
          <div className="cal-title">{MONTHS[view.m]} {view.y}</div>
          <button className="nav-btn" onClick={() => changeMonth(1)} aria-label="Следующий месяц">›</button>
        </div>
        <div className="legend">
          <span><span className="legend-dot" style={{ background: '#f5c542' }} />добавки</span>
          <span><span className="legend-dot" style={{ background: '#35a67c' }} />зал</span>
          <span><span className="legend-dot" style={{ background: '#7d94a8' }} />есть запись</span>
          <span style={{ display: 'inline-flex', gap: 6 }}>
            {GROUPS.filter(g => g.big).map(g => (
              <span key={g.k} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <span className="grp" style={{ background: g.c }}>{g.s}</span>{g.l.toLowerCase()}
              </span>
            ))}
          </span>
        </div>
        <div className="weekday-row">
          {WD.map((w, i) => <div key={w} className={'weekday' + (plan.includes(i) ? ' plan' : '')}>{w}</div>)}
        </div>
        <div className="day-grid">{cells}</div>
        <div className="sub-note" style={{ marginTop: 10 }}>Нажми на дату — откроется весь день: еда, тренировка, БЖУ, вывод.</div>
      </div>
      <DayDetail key={selected} data={data} k={selected} update={update} ai={ai} />
    </>
  );
}

function DayDetail({ data, k, update, ai }: { data: FormaData; k: string; update: Update; ai: Ai }) {
  const m = marksFor(data, k), e = dayFor(data, k);
  const w = data.weight.find(x => x.date === k);
  const b = data.bench.filter(x => x.date === k);
  const [weightInput, setWeightInput] = useState('');
  const [closing, setClosing] = useState(false);

  const setDay = (patch: Partial<NonNullable<typeof e>>) =>
    update(d => ({ ...d, days: d.days.map(x => (x.date === k ? { ...x, ...patch } : x)) }));

  // Закрыть день: ИИ пишет вывод, день начинает учитываться в средних.
  const closeDay = async () => {
    if (!e) return;
    if (!hasKey(ai.settings)) { setDay({ partial: false }); ai.notify('День закрыт. Для вывода дня добавь ключ ИИ в ⚙'); return; }
    setClosing(true);
    try {
      const verdict = await dayVerdict({ settings: ai.settings, data, day: e });
      setDay({ partial: false, verdict });
      ai.notify('День закрыт');
    } catch (err) {
      ai.notify(err instanceof AiError ? err.message : 'Не получилось: ' + (err as Error).message, true);
    } finally {
      setClosing(false);
    }
  };

  const toggle = (key: 'p' | 'g') => update(d => ({ ...d, marks: { ...d.marks, [k]: { ...marksFor(d, k), [key]: !marksFor(d, k)[key] } } }));

  const saveWeight = () => {
    const v = parseFloat(weightInput.replace(',', '.'));
    if (!(v > 20 && v < 300)) return;
    update(d => ({ ...d, weight: [...d.weight.filter(x => x.date !== k), { date: k, value: Math.round(v * 100) / 100 }] }));
    setWeightInput('');
  };

  return (
    <div className="day-detail">
      <div className="detail-date">{longD(k)}{e?.partial && <span className="partial-tag">не закрыт</span>}</div>
      <div className="detail-wd">{wdName(k)}</div>
      <div className="detail-marks">
        <button className={'mark pills' + (m.p ? ' on' : '')} onClick={() => toggle('p')}>{m.p ? '✓ Добавки' : 'Добавки'}</button>
        <button className={'mark gym' + (m.g ? ' on' : '')} onClick={() => toggle('g')}>{m.g ? '✓ Зал' : 'Зал'}</button>
      </div>
      {!!e?.groups?.length && <div className="chip-row">{e.groups.map(g => <Chip key={g} k={g} />)}</div>}
      {w && <Blk l="Вес">{num(w.value)} кг</Blk>}
      <form className="weight-row" onSubmit={ev => { ev.preventDefault(); saveWeight(); }}>
        <input className="inp" inputMode="decimal" placeholder={w ? 'Исправить вес, кг' : 'Вес в зале, кг'} value={weightInput} onChange={ev => setWeightInput(ev.target.value)} />
        <button className="btn" type="submit">Записать</button>
      </form>
      {b.length > 0 && <Blk l="Жим"><ul>{b.map((x, i) => <li key={i}>{num(x.w)} кг × {x.r}</li>)}</ul></Blk>}
      {e && <DayBody e={e} remove={{ meal: i => update(d => removeMeal(d, k, i)), exercise: i => update(d => removeExercise(d, k, i)) }} />}
      {!e && !w && !b.length && <div className="empty">За этот день записей нет.</div>}
      {e && (
        <div className="btn-col" style={{ marginTop: 12 }}>
          {e.partial
            ? <button className="btn" onClick={closeDay} disabled={closing}>{closing ? 'Пишу вывод…' : 'Закрыть день и получить вывод'}</button>
            : <button className="btn ghost" onClick={() => setDay({ partial: true })}>Открыть день снова</button>}
        </div>
      )}
    </div>
  );
}
