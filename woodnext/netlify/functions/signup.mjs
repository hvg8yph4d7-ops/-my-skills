// Приём заявки с сайта: POST /api/signup
import { getStore } from '@netlify/blobs';
import { addLead, notifyTelegram } from '../lib/leads.mjs';

const json = (obj, status = 200) => Response.json(obj, { status, headers: { 'Cache-Control': 'no-store' } });

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  let data;
  try { data = JSON.parse(await req.text()); } catch { return json({ ok: false, error: 'json' }, 400); }

  const store = getStore({ name: 'woodnext-leads', consistency: 'strong' });
  try {
    const res = await addLead(store, data);
    if (res.lead) await notifyTelegram(process.env, res.lead, res.totals);
    return json({ ok: res.ok, error: res.error });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: 'server' }, 500);
  }
};

export const config = { path: '/api/signup' };
