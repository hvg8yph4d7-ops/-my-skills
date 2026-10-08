import type { FormaData } from '../types';
import { GROUPS, e1rm, exerciseCount, gymDays, recovery } from '../lib/calc';
import { daysBetween, longD, num, shortD, wdName } from '../lib/format';
import { Chip } from './common';

type Update = (fn: (d: FormaData) => FormaData) => void;

export function Train({ data, today, update }: { data: FormaData; today: string; update: Update }) {
  const gd = gymDays(data);

  const toggleSore = (k: string, on: boolean) => update(d => {
    const sore = { ...d.sore };
    if (on) delete sore[k]; else sore[k] = today;
    return { ...d, sore };
  });

  return (
    <>
      <div className="card">
        <div className="card-label">Восстановление мышц</div>
        <div className="musc-grid">
          {GROUPS.map(g => {
            const r = recovery(data, g, today);
            if (!r) return (
              <div className="musc" key={g.k} style={{ borderLeftColor: g.c }}>
                <div className="nm">{g.l}</div><div className="ago">ещё не было</div><div className="st long">можно начинать</div>
              </div>
            );
            const agoTxt = r.ago === 0 ? 'сегодня' : r.ago === 1 ? 'вчера' : r.ago + ' дн. назад';
            const soreOn = r.txt.startsWith('ещё болит');
            return (
              <div className="musc" key={g.k} style={{ borderLeftColor: g.c }}>
                <div className="nm">{g.l}</div>
                <div className="ago">{agoTxt} · {shortD(r.last.date)} · {r.times}×</div>
                <div className={'st ' + r.cls}>{r.txt}</div>
                <button className={'sore-btn' + (soreOn ? ' on' : '')} onClick={() => toggleSore(g.k, soreOn)}>
                  {soreOn ? 'уже не болит' : 'ещё болит'}
                </button>
              </div>
            );
          })}
        </div>
        <div className="sub-note">Большим группам нужно минимум 3 дня отдыха, рукам — 2. Если мышца ещё болит — нажми «ещё болит», отметка держится 2 дня и важнее календаря.</div>
      </div>

      <div className="stat-strip">
        <div className="stat-box"><div className="n">{gd.length}</div><div className="l">тренировок</div></div>
        <div className="stat-box"><div className="n">{gd.filter(d => daysBetween(d.date, today) < 7).length}</div><div className="l">за 7 дней</div></div>
        <div className="stat-box"><div className="n">{exerciseCount(data)}</div><div className="l">упражнений</div></div>
      </div>

      {!gd.length ? <div className="card"><div className="empty">Тренировок пока нет</div></div> : gd.map(d => {
        const b = data.bench.filter(x => x.date === d.date);
        return (
          <div className="entry" key={d.date}>
            <div className="entry-date">{longD(d.date)}</div>
            <div className="entry-wd">{wdName(d.date)}</div>
            <div className="chip-row">{d.groups!.map(g => <Chip key={g} k={g} />)}</div>
            {!!d.training?.length && <ul className="ex-list">{d.training.map((x, i) => <li key={i}>{x}</li>)}</ul>}
            {b.length > 0 && (
              <div className="sub-note" style={{ marginTop: 8 }}>
                Жим: {b.map(x => `${num(x.w)} кг × ${x.r} · расч. макс ${num(e1rm(x))} кг`).join(', ')}
              </div>
            )}
            {d.trainNote && <div className="verdict" style={{ marginTop: 10 }}>{d.trainNote}</div>}
          </div>
        );
      })}
    </>
  );
}
