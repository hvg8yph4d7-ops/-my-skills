// Админка: POST /api/admin { key, op: 'list' | 'checkin' | 'delete', row, id, came }
import { getStore } from '@netlify/blobs';
import { checkPassword, listLeads, setCame, removeLead } from '../lib/leads.mjs';

const json = (obj, status = 200) => Response.json(obj, { status, headers: { 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  let d;
  try { d = JSON.parse(await req.text()); } catch { return json({ ok: false, error: 'json' }, 400); }

  if (!checkPassword(d.key, process.env)) {
    await new Promise((r) => setTimeout(r, 1500)); // замедляем подбор пароля
    return json({ ok: false, error: 'password' });
  }

  const store = getStore({ name: 'woodnext-leads', consistency: 'strong' });
  try {
    if (d.op === 'checkin') {
      const r = await setCame(store, d.row, d.id, d.came);
      if (!r.ok) return json(r);
    } else if (d.op === 'delete') {
      const r = await removeLead(store, d.row, d.id);
      if (!r.ok) return json(r);
    }
    const leads = (await listLeads(store)).map((l) => ({ ...l, row: l.key }));
    return json({ ok: true, leads, now: new Date().toISOString() });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: 'server' }, 500);
  }
};

export const config = { path: '/api/admin' };
