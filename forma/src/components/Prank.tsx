import { useState } from 'react';

/** Шутка для друга: при запуске вопрос, пройти можно только кнопкой «Да». «Нет» убегает. */
export function Prank({ onYes }: { onYes: () => void }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [tries, setTries] = useState(0);

  const run = () => {
    setTries(t => t + 1);
    setPos({ left: 10 + Math.random() * 60, top: 15 + Math.random() * 65 });
  };

  return (
    <div className="prank">
      <div className="prank-q">Ты хуесос?</div>
      {tries > 2 && <div className="prank-hint">{tries > 6 ? 'Сдавайся 😏' : 'Не получится 😄'}</div>}
      <div className="prank-btns">
        <button className="btn prank-yes" onClick={onYes}>Да</button>
        <button className="btn ghost prank-no" onPointerDown={run} onClick={run}
          style={pos ? { position: 'fixed', left: pos.left + '%', top: pos.top + '%' } : undefined}>Нет</button>
      </div>
    </div>
  );
}
