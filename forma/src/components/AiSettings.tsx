import { useState } from 'react';
import type { ModelId, Settings as AppSettings } from '../storage';

type Props = {
  settings: AppSettings;
  saveSettings: (s: AppSettings) => void;
  notify: (msg: string, err?: boolean) => void;
};

const CLAUDE_MODELS: { id: ModelId; l: string; d: string }[] = [
  { id: 'claude-opus-5-5', l: 'Opus 5.5', d: 'точнее, ~1–3 ¢ за запись' },
  { id: 'claude-haiku-5-5', l: 'Haiku 5.5', d: 'дешевле в ~40 раз, проще' },
];

/** Выбор ИИ для разбора записей: Gemini (бесплатно, нужен VPN) или Claude (платно). */
export function AiSettings({ settings, saveSettings, notify }: Props) {
  const [gKey, setGKey] = useState(settings.geminiKey);
  const [cKey, setCKey] = useState(settings.apiKey);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const gemini = settings.provider === 'gemini';

  // Сохраняем ключ Gemini и сразу проверяем его, загружая список доступных моделей.
  const saveGemini = async () => {
    const k = gKey.trim();
    if (!k) { saveSettings({ ...settings, geminiKey: '' }); notify('Ключ удалён'); return; }
    setLoading(true);
    try {
      const { geminiModels, pickDefaultModel } = await import('../lib/gemini');
      const list = await geminiModels(k);
      if (!list.length) throw new Error('Ключ работает, но подходящих моделей нет.');
      setModels(list);
      const keep = list.some(m => m.id === settings.geminiModel);
      saveSettings({ ...settings, geminiKey: k, geminiModel: keep ? settings.geminiModel : pickDefaultModel(list) });
      notify('Ключ работает и сохранён на этом телефоне');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  };

  const saveClaude = () => {
    const k = cKey.trim();
    if (k && !k.startsWith('sk-ant-')) { notify('Ключ Claude должен начинаться с sk-ant-', true); return; }
    saveSettings({ ...settings, apiKey: k });
    notify(k ? 'Ключ сохранён на этом телефоне' : 'Ключ удалён');
  };

  const modelList = models.length ? models : settings.geminiModel ? [{ id: settings.geminiModel, name: settings.geminiModel }] : [];

  return (
    <div className="card">
      <div className="card-label">ИИ для записей</div>
      <div className="detail-marks">
        <button className={'mark pills' + (gemini ? ' on' : '')} onClick={() => saveSettings({ ...settings, provider: 'gemini' })}>
          Gemini<div className="mark-sub">бесплатно, нужен VPN</div>
        </button>
        <button className={'mark pills' + (!gemini ? ' on' : '')} onClick={() => saveSettings({ ...settings, provider: 'claude' })}>
          Claude<div className="mark-sub">платно, точнее</div>
        </button>
      </div>

      {gemini ? (
        <>
          <form className="weight-row" onSubmit={ev => { ev.preventDefault(); saveGemini(); }}>
            <input className="inp" type="password" autoComplete="off" placeholder="Ключ Gemini (AIza…)" value={gKey} onChange={ev => setGKey(ev.target.value)} />
            <button className="btn" type="submit" disabled={loading}>{loading ? '…' : 'Сохранить'}</button>
          </form>
          {modelList.length > 0 && (
            <>
              <div className="blk-l">Модель</div>
              <select className="inp" style={{ width: '100%', marginBottom: 8 }} value={settings.geminiModel}
                onChange={ev => saveSettings({ ...settings, geminiModel: ev.target.value })}>
                {modelList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </>
          )}
          <div className="sub-note">
            {settings.geminiKey ? '✓ Ключ сохранён. ' : 'Ключа пока нет. '}
            Получить: aistudio.google.com → Get API key (с включённым VPN). Flash-Lite — больше бесплатных запросов в день, обычная Flash — умнее, но лимит меньше. На бесплатном тарифе Google может использовать записи для обучения своих моделей.
          </div>
        </>
      ) : (
        <>
          <form className="weight-row" onSubmit={ev => { ev.preventDefault(); saveClaude(); }}>
            <input className="inp" type="password" autoComplete="off" placeholder="Ключ Claude (sk-ant-…)" value={cKey} onChange={ev => setCKey(ev.target.value)} />
            <button className="btn" type="submit">Сохранить</button>
          </form>
          <div className="blk-l">Модель</div>
          <div className="detail-marks">
            {CLAUDE_MODELS.map(m => (
              <button key={m.id} className={'mark pills' + (settings.model === m.id ? ' on' : '')} onClick={() => saveSettings({ ...settings, model: m.id })}>
                {m.l}<div className="mark-sub">{m.d}</div>
              </button>
            ))}
          </div>
          <div className="sub-note">
            {settings.apiKey ? '✓ Ключ сохранён. ' : 'Ключа пока нет. '}
            Получить: console.anthropic.com → API Keys. Там же поставь лимит расходов в месяц.
          </div>
        </>
      )}
      <div className="sub-note">Ключи хранятся только на этом телефоне и не попадают в резервную копию.</div>
    </div>
  );
}
