import { useState } from 'react';
import type { FormaData } from '../types';

type Props = {
  data: FormaData;
  update: (fn: (d: FormaData) => FormaData) => void;
  notify: (msg: string, err?: boolean) => void;
};

/** Схема добавок и правила приёма (показываются подсказкой на «Обзоре»). */
export function SupplementsSettings({ data, update, notify }: Props) {
  const [rows, setRows] = useState(data.supplements.length ? data.supplements : [{ time: '', items: '' }]);
  const [rules, setRules] = useState((data.suppRules || []).join('\n'));
  const set = (i: number, k: 'time' | 'items', v: string) => setRows(r => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  const save = () => {
    const supplements = rows.map(r => ({ time: r.time.trim(), items: r.items.trim() })).filter(r => r.time || r.items);
    const suppRules = rules.split('\n').map(s => s.trim()).filter(Boolean);
    update(d => ({ ...d, supplements, suppRules }));
    notify('Схема добавок сохранена');
  };

  return (
    <div className="card">
      <div className="card-label">Добавки</div>
      {rows.map((r, i) => (
        <div key={i} className="supp-edit">
          <div className="weight-row">
            <input className="inp" value={r.time} onChange={e => set(i, 'time', e.target.value)} placeholder="Когда: утро, с едой" />
            <button className="btn ghost" onClick={() => setRows(x => x.filter((_, j) => j !== i))} aria-label="Убрать строку">×</button>
          </div>
          <textarea className="inp full" rows={2} value={r.items} onChange={e => set(i, 'items', e.target.value)} placeholder="Что: омега-3 — 3 капсулы · витамин D" />
        </div>
      ))}
      <button className="btn ghost full" onClick={() => setRows(x => [...x, { time: '', items: '' }])}>+ Приём</button>
      <div className="blk-l">Правила приёма — по одному в строке</div>
      <textarea className="inp full" rows={3} value={rules} onChange={e => setRules(e.target.value)} placeholder="Например: цинк не натощак" />
      <button className="btn full" onClick={save}>Сохранить добавки</button>
      <div className="sub-note">Отметка «Добавки» в календаре — одна на день, за все сразу.</div>
    </div>
  );
}
