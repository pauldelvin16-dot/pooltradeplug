// One-click unsubscribe endpoint (RFC 8058).
// GET  ?token=...   → validate token, return the address it belongs to
// POST ?token=...   → record the opt-out (also handles Gmail/Yahoo one-click POSTs)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const b64urlDecode = (s: string) =>
  atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));

const sign = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
};

const parseToken = async (token: string, secret: string): Promise<string | null> => {
  const [payload, mac] = String(token || '').split('.');
  if (!payload || !mac) return null;
  const expected = await sign(payload, secret);
  if (expected !== mac) return null;
  try {
    const email = b64urlDecode(payload).toLowerCase().trim();
    return email.includes('@') ? email : null;
  } catch { return null; }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const url = new URL(req.url);
  let token = url.searchParams.get('token') || '';
  if (!token && req.method === 'POST') {
    try {
      const body = await req.clone().json();
      token = body?.token || '';
    } catch { /* one-click form post — token stays in the query string */ }
  }

  const email = await parseToken(token, serviceKey);
  if (!email) return json({ ok: false, error: 'Invalid or expired unsubscribe link' }, 400);

  if (req.method === 'GET') {
    const { data } = await supabase.from('email_optouts').select('email').eq('email', email).maybeSingle();
    return json({ ok: true, email, already: !!data });
  }

  const { error } = await supabase.from('email_optouts').upsert({ email, source: 'one_click' }, { onConflict: 'email' });
  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, email });
});
