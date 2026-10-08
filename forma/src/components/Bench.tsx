import type { FormaData } from '../types';
import { e1rm, sortedBench } from '../lib/calc';
import { num, shortD } from '../lib/format';
import { BigNum, Chart } from './common';

export function Bench({ data }: { data: FormaData }) {
  const sb = sortedBench(data);
  const last = sb.length ? sb[sb.length - 1] : null;
  // Рекорд — самый тяжёлый подход; при равенстве — первый по записи, как в старом трекере.
  const pr = data.bench.reduce<FormaData['bench'][number] | null>((m, e) => (!m || e.w > m.w ? e : m), null);

  return (
    <>
      <div className="row2">
        <div className="card green">
          <div className="card-label">Текущий подход</div>
          <BigNum v={last ? num(last.w) : '—'} unit="кг" yellow />
          <div className="sub-note">
            {last ? `${shortD(last.date)} · ${last.r} повт. · расч. макс ${num(e1rm(last))} кг` : 'нет данных'}
          </div>
        </div>
        <div className="card">
          <div className="card-label">Максимум</div>
          <BigNum v={num(data.benchMax)} unit="кг" />
          <div className="sub-note">примерно, на максимум ещё не жал · раньше было {num(data.oldBenchMax)}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-label">Прогресс</div>
        <Chart id="bench" points={sb.map(e => ({ date: e.date, v: e.w }))} unit="кг" />
      </div>
      <div className="card">
        <div className="card-label">Все подходы</div>
        {!sb.length ? <div className="empty">Пока пусто.</div> : sb.slice().reverse().map((e, i) => (
          <div className="list-row" key={i}>
            <div>
              {shortD(e.date)}
              <div className="meta">{e.r} повт. · расч. макс {num(e1rm(e))} кг</div>
            </div>
            <div className="val">{num(e.w)} кг{e === pr && <span className="pr-badge">РЕКОРД</span>}</div>
          </div>
        ))}
      </div>
    </>
  );
}
