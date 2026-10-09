import { useRef, useState } from 'react';
import type { FormaData, Goal, Profile } from '../types';
import { migrate, seedData } from '../storage';
import { GOALS, calcTargets, emptyData } from '../lib/profile';
import { todayKey } from '../lib/format';

type Props = { onDone: (d: FormaData) => void; notify: (msg: string, err?: boolean) => void };

const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return n > 0 ? n : null; };

/** Первый запуск: короткая анкета → пустой дневник со своими нормами. */
export function Onboarding({ onDone, notify }: Props) {
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'m' | 'f'>('m');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<Goal>('gain');
  const fileRef = useRef<HTMLInputElement>(null);

  const profile: Profile = { name: name.trim(), sex, age: num(age), height: num(height), weight: num(weight), goal };
  const t = calcTargets(profile);
  const ready = profile.name && profile.weight && profile.height && profile.age;

  const importFile = async (f: File) => {
    try { onDone(migrate(JSON.parse(await f.text()))); notify('Дневник загружен из копии'); }
    catch (e) { notify('Не получилось прочитать файл: ' + (e as Error).message, true); }
  };

  // Скрытый вход для владельца: ссылка с ?david загружает его дневник из чата.
  const ownerLink = new URLSearchParams(location.search).has('david');

  return (
    <>
      <div className="card">
        <div className="card-label">Добро пожаловать</div>
        <div className="blk-b">Это твой личный дневник еды, тренировок и веса. Ответь на пару вопросов — посчитаю твои нормы КБЖУ. Всё хранится только на этом телефоне.</div>
      </div>

      <div className="card">
        <div className="blk-l">Как тебя зовут</div>
        <input className="inp full" value={name} onChange={e => setName(e.target.value)} placeholder="Имя" />
        <div className="blk-l">Пол</div>
        <div className="detail-marks">
          <button className={'mark pills' + (sex === 'm' ? ' on' : '')} onClick={() => setSex('m')}>Мужской</button>
          <button className={'mark pills' + (sex === 'f' ? ' on' : '')} onClick={() => setSex('f')}>Женский</button>
        </div>
        <div className="row3">
          <label><div className="blk-l">Возраст</div><input className="inp full" inputMode="numeric" value={age} onChange={e => setAge(e.target.value)} placeholder="лет" /></label>
          <label><div className="blk-l">Рост</div><input className="inp full" inputMode="numeric" value={height} onChange={e => setHeight(e.target.value)} placeholder="см" /></label>
          <label><div className="blk-l">Вес</div><input className="inp full" inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} placeholder="кг" /></label>
        </div>
        <div className="blk-l">Цель</div>
        <div className="detail-marks">
          {GOALS.map(g => <button key={g.id} className={'mark pills' + (goal === g.id ? ' on' : '')} onClick={() => setGoal(g.id)}>{g.l}</button>)}
        </div>
        {ready && (
          <div className="sub-note" style={{ marginBottom: 12 }}>
            Твои нормы в день: <b>{t.kcal} ккал</b>, белок {t.p} г, жиры {t.f} г, углеводы {t.c} г, клетчатка {t.fib} г. Потом можно поменять в ⚙.
          </div>
        )}
        <button className="btn full" disabled={!ready} onClick={() => onDone(emptyData(profile, todayKey()))}>Начать</button>
      </div>

      <div className="card">
        <div className="card-label">Уже вёл дневник?</div>
        <div className="btn-col">
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Загрузить резервную копию</button>
          {ownerLink && <button className="btn ghost" onClick={() => onDone(seedData())}>Загрузить дневник Давида из чата</button>}
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
      </div>
    </>
  );
}
