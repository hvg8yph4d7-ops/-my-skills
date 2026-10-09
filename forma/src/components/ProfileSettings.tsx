import { useState } from 'react';
import type { FormaData, Goal, Profile } from '../types';
import { GOALS, calcTargets } from '../lib/profile';
import { WD } from '../lib/format';

type Props = { data: FormaData; update: (fn: (d: FormaData) => FormaData) => void; notify: (msg: string, err?: boolean) => void };

const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return n > 0 ? n : null; };
const str = (n: number | null | undefined) => (n ? String(n) : '');

/** Профиль, нормы КБЖУ, план тренировок и счётчик «без алкоголя». */
export function ProfileSettings({ data, update, notify }: Props) {
  const p0: Profile = data.profile ?? { name: '', sex: 'm', age: null, height: null, weight: null, goal: 'gain' };
  const [name, setName] = useState(p0.name);
  const [sex, setSex] = useState(p0.sex);
  const [age, setAge] = useState(str(p0.age));
  const [height, setHeight] = useState(str(p0.height));
  const [weight, setWeight] = useState(str(p0.weight));
  const [goal, setGoal] = useState<Goal>(p0.goal);
  const [note, setNote] = useState(p0.note || '');
  const [talk, setTalk] = useState(p0.talk || '');
  const [t, setT] = useState({ ...data.targets });
  const [split, setSplit] = useState<Record<string, string>>({ ...data.split });
  const [sober, setSober] = useState(data.soberSince || '');

  const profile: Profile = { ...p0, name: name.trim(), sex, age: num(age), height: num(height), weight: num(weight), goal, note: note.trim() || undefined, talk: talk.trim() || undefined };

  const save = () => {
    const cleanSplit = Object.fromEntries(Object.entries(split).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));
    update(d => ({ ...d, profile, targets: t, split: cleanSplit, soberSince: sober }));
    notify('Профиль сохранён');
  };

  const field = (k: keyof typeof t, l: string) => (
    <label key={k}><div className="blk-l">{l}</div>
      <input className="inp full" inputMode="numeric" value={t[k] ?? ''} onChange={e => setT({ ...t, [k]: Number(e.target.value.replace(/\D/g, '')) || 0 })} />
    </label>
  );

  return (
    <div className="card">
      <div className="card-label">Профиль и нормы</div>
      <div className="blk-l">Имя</div>
      <input className="inp full" value={name} onChange={e => setName(e.target.value)} />
      <div className="detail-marks">
        <button className={'mark pills' + (sex === 'm' ? ' on' : '')} onClick={() => setSex('m')}>Мужской</button>
        <button className={'mark pills' + (sex === 'f' ? ' on' : '')} onClick={() => setSex('f')}>Женский</button>
      </div>
      <div className="row3">
        <label><div className="blk-l">Возраст</div><input className="inp full" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} /></label>
        <label><div className="blk-l">Рост, см</div><input className="inp full" inputMode="numeric" value={height} onChange={e => setHeight(e.target.value)} /></label>
        <label><div className="blk-l">Вес, кг</div><input className="inp full" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} /></label>
      </div>
      <div className="blk-l">Цель</div>
      <div className="detail-marks">
        {GOALS.map(g => <button key={g.id} className={'mark pills' + (goal === g.id ? ' on' : '')} onClick={() => setGoal(g.id)}>{g.l}</button>)}
      </div>

      <div className="blk-l">Нормы в день</div>
      <div className="row3">{field('kcal', 'Ккал')}{field('p', 'Белок, г')}{field('f', 'Жиры, г')}</div>
      <div className="row3">{field('c', 'Углеводы, г')}{field('fib', 'Клетчатка, г')}</div>
      <button className="btn ghost full" onClick={() => setT(calcTargets(profile))}>Пересчитать нормы по анкете</button>

      <div className="blk-l">План тренировок (пусто — отдых)</div>
      {WD.map((w, i) => (
        <div key={w} className="weight-row" style={{ marginBottom: 6 }}>
          <span style={{ width: 28, color: 'var(--dim)', fontSize: 13 }}>{w}</span>
          <input className="inp" value={split[i] || ''} placeholder="—" onChange={e => setSplit({ ...split, [i]: e.target.value })} />
        </div>
      ))}

      <div className="blk-l" style={{ marginTop: 10 }}>Без алкоголя с (необязательно)</div>
      <input className="inp full" type="date" value={sober} onChange={e => setSober(e.target.value)} />

      <div className="blk-l">О себе для ИИ (необязательно)</div>
      <textarea className="inp full" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Например: тренируюсь 3 раза в неделю, не ем свинину, колено побаливает" />

      <div className="blk-l">Как советнику со мной говорить (необязательно)</div>
      <textarea className="inp full" rows={3} value={talk} onChange={e => setTalk(e.target.value)} placeholder="Например: коротко, без воды, можно с юмором и матом, сразу цифры" />

      <button className="btn full" onClick={save}>Сохранить профиль</button>
    </div>
  );
}
