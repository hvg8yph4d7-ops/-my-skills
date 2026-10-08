import type { FormaData } from '../types';
import { longD, wdName } from '../lib/format';
import { DayBody } from './common';

export function Diary({ data }: { data: FormaData }) {
  const days = data.days.slice().sort((a, b) => b.date.localeCompare(a.date));
  if (!days.length) return <div className="card"><div className="empty">Записей пока нет</div></div>;
  return (
    <>
      {days.map(e => (
        <div className="entry" key={e.date}>
          <div className="entry-date">{longD(e.date)}{e.partial && <span className="partial-tag">не закрыт</span>}</div>
          <div className="entry-wd">{wdName(e.date)}</div>
          <DayBody e={e} />
        </div>
      ))}
    </>
  );
}
