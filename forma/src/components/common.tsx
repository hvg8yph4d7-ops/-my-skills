import type { ReactNode } from 'react';
import type { Day, Macros } from '../types';
import { groupOf } from '../lib/calc';
import { exerciseLine, foodLine } from '../lib/entry';
import { num, shortD } from '../lib/format';

export function Blk({ l, children }: { l: string; children: ReactNode }) {
  return (
    <div className="blk">
      <div className="blk-l">{l}</div>
      <div className="blk-b">{children}</div>
    </div>
  );
}

export function BigNum({ v, unit, yellow }: { v: ReactNode; unit: string; yellow?: boolean }) {
  return <div className={'big-num' + (yellow ? ' yellow' : '')}>{v}<span className="unit">{unit}</span></div>;
}

export function MacroStrip({ m }: { m: Macros }) {
  const box = (n: ReactNode, l: string) => <div className="macro-box"><div className="n">{n}</div><div className="l">{l}</div></div>;
  return (
    <div className="macro-strip">
      {box(m.p, 'Б')}{box(m.f, 'Ж')}{box(m.c, 'У')}{box(m.fib != null ? m.fib : '—', 'клетч.')}{box(m.kcal, 'ккал')}
    </div>
  );
}

export function Chip({ k }: { k: string }) {
  const g = groupOf(k);
  return g ? <span className="chip" style={{ background: g.c }}>{g.l}</span> : null;
}

type Remove = { meal: (i: number) => void; exercise: (i: number) => void };

/** Строки старого формата + записи через Claude; во вкладке календаря новые можно удалить. */
function Items({ lines, items, onRemove }: { lines?: string[]; items: string[]; onRemove?: (i: number) => void }) {
  return (
    <ul>
      {(lines || []).map((x, i) => <li key={'l' + i}>{x}</li>)}
      {items.map((x, i) => (
        <li key={'i' + i}>{x}{onRemove && <button className="del-btn" aria-label="Удалить" onClick={() => onRemove(i)}>×</button>}</li>
      ))}
    </ul>
  );
}

/** Содержимое дня: день, еда, тренировка, добавки, БЖУ, вывод. Общее для дневника и календаря. */
export function DayBody({ e, remove }: { e: Day; remove?: Remove }) {
  const meals = (e.meals || []).map(foodLine);
  const exs = (e.exercises || []).map(exerciseLine);
  return (
    <>
      {e.work && <Blk l="День">{e.work}</Blk>}
      {(!!e.food?.length || meals.length > 0) && <Blk l="Еда"><Items lines={e.food} items={meals} onRemove={remove?.meal} /></Blk>}
      {(!!e.training?.length || exs.length > 0) && <Blk l="Тренировка"><Items lines={e.training} items={exs} onRemove={remove?.exercise} /></Blk>}
      {e.supps && <Blk l="Добавки">{e.supps}</Blk>}
      {e.macros && <div className="blk"><div className="blk-l">БЖУ и клетчатка</div><MacroStrip m={e.macros} /></div>}
      {e.verdict && <div className="blk"><div className="blk-l">Вывод дня</div><div className="verdict">{e.verdict}</div></div>}
    </>
  );
}

/** Линейный график как в старом трекере. */
export function Chart({ id, points, unit }: { id: string; points: { date: string; v: number }[]; unit: string }) {
  if (points.length < 2) return <div className="empty">График появится, когда будет две записи.</div>;
  const W = 340, H = 150, P = 26;
  const vals = points.map(e => e.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) || 5;
  const lo = min - span * 0.3, hi = max + span * 0.3;
  const x = (i: number) => P + (W - P * 2) * (i / (points.length - 1));
  const y = (v: number) => H - P - (H - P * 2) * ((v - lo) / (hi - lo));
  const pts = points.map((e, i) => x(i) + ',' + y(e.v));
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={'g-' + id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97757" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d97757" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map(f => {
          const yy = P + (H - P * 2) * f;
          return <line key={f} x1={P} y1={yy} x2={W - P} y2={yy} stroke="#3a3833" strokeWidth="1" />;
        })}
        <path d={`M${x(0)},${H - P} L${pts.join(' L')} L${x(points.length - 1)},${H - P} Z`} fill={`url(#g-${id})`} />
        <polyline points={pts.join(' ')} fill="none" stroke="#d97757" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((e, i) => <circle key={i} cx={x(i)} cy={y(e.v)} r="4" fill="#1f1e1c" stroke="#f0ece4" strokeWidth="2" />)}
        <text x={P} y="14" fill="#9c968b" fontSize="10">{num(max)} {unit}</text>
        <text x={P} y={H - 6} fill="#9c968b" fontSize="10">{shortD(points[0].date)}</text>
        <text x={W - P} y={H - 6} fill="#9c968b" fontSize="10" textAnchor="end">{shortD(points[points.length - 1].date)}</text>
      </svg>
    </div>
  );
}
