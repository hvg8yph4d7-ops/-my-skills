import { useRef } from 'react';
import type { FormaData } from '../types';
import { migrate, seedData } from '../storage';
import { todayKey } from '../lib/format';

type Props = {
  data: FormaData;
  persisted: boolean;
  replace: (d: FormaData) => void;
  notify: (msg: string, err?: boolean) => void;
};

export function Settings({ data, persisted, replace, notify }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = async () => {
    const name = `forma-backup-${todayKey()}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], name, { type: 'application/json' });
    // На iPhone удобнее системное меню «Поделиться» → «Сохранить в Файлы».
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; }
      catch (e) { if ((e as Error).name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importJson = async (f: File) => {
    try {
      const next = migrate(JSON.parse(await f.text()));
      if (!confirm(`Заменить текущие данные (${data.days.length} дн.) данными из файла (${next.days.length} дн.)?`)) return;
      replace(next);
      notify('Данные загружены из файла');
    } catch (e) {
      notify('Не получилось прочитать файл: ' + (e as Error).message, true);
    }
  };

  const reset = () => {
    if (!confirm('Вернуть исходные данные за 14.09–08.10? Всё, что добавлено в приложении, пропадёт. Сначала лучше скачать копию.')) return;
    replace(seedData());
    notify('Исходные данные восстановлены');
  };

  return (
    <>
      <div className="card">
        <div className="card-label">Резервная копия</div>
        <div className="blk-b" style={{ marginBottom: 12 }}>
          Данные хранятся только на этом телефоне. Время от времени сохраняй копию в «Файлы» или отправляй себе в Telegram.
        </div>
        <div className="btn-col">
          <button className="btn" onClick={exportJson}>Скачать копию (JSON)</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Загрузить из файла</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        </div>
      </div>

      <div className="card">
        <div className="card-label">Что сейчас в приложении</div>
        <div className="list-row"><div>Дней в дневнике</div><div className="val">{data.days.length}</div></div>
        <div className="list-row"><div>Взвешиваний</div><div className="val">{data.weight.length}</div></div>
        <div className="list-row"><div>Подходов в жиме</div><div className="val">{data.bench.length}</div></div>
        <div className="list-row"><div>Продуктов в справочнике</div><div className="val">{data.products.length}</div></div>
        <div className="sub-note">
          {persisted
            ? 'Хранилище защищено: браузер не будет удалять данные сам.'
            : 'Чтобы iPhone не удалил данные, добавь приложение на главный экран: «Поделиться» → «На экран „Домой“».'}
        </div>
      </div>

      <div className="card">
        <div className="card-label">Сброс</div>
        <button className="btn danger" onClick={reset}>Вернуть исходные данные</button>
      </div>
    </>
  );
}
