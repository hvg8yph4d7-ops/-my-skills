import type { FormaData } from '../types';
import { averages, planDays, rate, sortedBench, sortedWeight } from '../lib/calc';
import { WD, WDF, daysBetween, longD, num, plural, shortD, wdIndex } from '../lib/format';
import { BigNum, Chart } from './common';

export function Overview({ data, today }: { data: FormaData; today: string }) {
  const w = sortedWeight(data);
  const lw = w.length ? w[w.length - 1] : null;
  let wn = lw ? shortD(lw.date) : 'нет данных';
  if (lw && w.length > 1) {
    const diff = Math.round((lw.value - w[0].value) * 10) / 10;
    wn += ' · ' + (diff >= 0 ? '+' : '') + num(diff) + ' кг с начала';
  }

  const sb = sortedBench(data);
  const last = sb.length ? sb[sb.length - 1] : null;

  const marks = Object.values(data.marks);
  const sober = data.soberSince ? Math.max(0, daysBetween(data.soberSince, today)) : null;

  const plan = planDays(data);
  const twd = wdIndex(today);
  const nxt = plan.find(p => p > twd);
  const nd = plan.includes(twd) ? twd : nxt !== undefined ? nxt : plan[0];

  const lastDay = data.days.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  const av = averages(data);
  const T = data.targets;

  const box = (val: number, unit: string, label: string, target: number, dir: 'up' | 'down') => {
    const r = rate(val, target, dir);
    return (
      <div className="avg-box" key={label}>
        <div className="n">{num(val)}<small>{unit}</small></div>
        <div className="l">{label}</div>
        <div className={'t ' + r.cls}>{r.txt}</div>
      </div>
    );
  };

  return (
    <>
      <div className="row2">
        <div className="card">
          <div className="card-label">Вес</div>
          <BigNum v={lw ? num(lw.value) : '—'} unit="кг" />
          <div className="sub-note">{wn} · взвешивания в зале</div>
        </div>
        <div className="card green">
          <div className="card-label">Жим лёжа</div>
          <BigNum v={num(data.benchMax)} unit="кг" yellow />
          <div className="sub-note">
            {last ? `примерно, до проверки · последний подход ${num(last.w)} × ${last.r}` : 'примерно, до проверки'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-label">Динамика веса</div>
        <Chart id="weight" points={w.map(e => ({ date: e.date, v: e.value }))} unit="кг" />
      </div>

      <div className="stat-strip">
        <div className="stat-box"><div className="n">{marks.filter(m => m.g).length}</div><div className="l">тренировок</div></div>
        <div className="stat-box"><div className="n">{marks.filter(m => m.p).length}</div><div className="l">дней с добавками</div></div>
        <div className="stat-box"><div className="n">{data.days.length}</div><div className="l">дней в дневнике</div></div>
      </div>

      {sober !== null && (
        <div className="card green">
          <div className="card-label">Без алкоголя</div>
          <BigNum v={sober} unit={plural(sober, 'день', 'дня', 'дней')} yellow />
          <div className="sub-note">с {longD(data.soberSince)} · считает сам, каждый день +1</div>
        </div>
      )}

      <div className="card">
        <div className="card-label">{av ? `Среднее за день — ${av.n} полных дней` : 'Среднее за день'}</div>
        {av ? (
          <>
            <div className="avg-grid">
              {box(av.avg.kcal, 'ккал', 'калории', T.kcal, 'up')}
              {box(av.avg.p, 'г', 'белки', T.p, 'up')}
              {box(av.avg.f, 'г', 'жиры', T.f, 'down')}
              {box(av.avg.c, 'г', 'углеводы', T.c, 'up')}
              {box(av.avg.fib, 'г', 'клетчатка', T.fib, 'up')}
            </div>
            <div className="sub-note">Незакрытые дни в среднее не входят. Клетчатка считается примерно.</div>
          </>
        ) : <div className="empty">Нет данных</div>}
      </div>

      {plan.length > 0 && (
        <div className="card">
          <div className="card-label">Ближайшая тренировка</div>
          <div className="blk-b">
            {(plan.includes(twd) ? 'Сегодня ' : 'Следующая: ') + WDF[nd] + ' — ' + (data.split[nd] || 'по плану') + '.'}
          </div>
          <div className="sub-note">
            План: {plan.map(d => WD[d].toLowerCase() + ' — ' + (data.split[d] || '—')).join(' · ')}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-label">Схема добавок</div>
        {data.supplements.map((s, i) => (
          <div className="blk" key={i}><div className="blk-l">{s.time}</div><div className="blk-b">{s.items}</div></div>
        ))}
      </div>

      <div className="card">
        <div className="card-label">Последний вывод дня</div>
        <div className="verdict">{lastDay?.verdict || 'Записей пока нет'}</div>
      </div>
    </>
  );
}
