// Auth helper actions — public, dynamic-origin, privacy-safe.
// Endpoints (POST):
//   { action: 'forgot_password', email, origin? }     → always returns ok (silent for unknown)
//   { action: 'request_otp', email }                  → always returns ok; sends only if user exists
//   { action: 'verify_otp', email, code }             → returns { ok, session? }
//   { action: 'send_welcome', email, name }           → fired post-signup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const origin = body.origin || req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
  const callEmail = async (template: string, to: string, data: any) => {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}`, Origin: origin },
        body: JSON.stringify({ to, template, data, origin }),
      });
    } catch (e) { console.error('email send failed', e); }
  };

  if (body.action === 'forgot_password') {
    const email = String(body.email || '').toLowerCase().trim();
    if (!email.includes('@')) {
      // Always respond ok — never reveal if email exists
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: profile } = await supabase.from('profiles').select('user_id, first_name, email').eq('email', email).maybeSingle();
    if (profile) {
      const redirectTo = `${origin}/login`;
      const { data: linkData } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });
      const reset_url = (linkData as any)?.properties?.action_link || redirectTo;
      await callEmail('password_reset', email, { name: profile.first_name, reset_url });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (body.action === 'request_otp') {
    const email = String(body.email || '').toLowerCase().trim();
    if (!email.includes('@')) {
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: profile } = await supabase.from('profiles').select('first_name, email').eq('email', email).maybeSingle();
    if (profile) {
      const code = generateCode();
      await supabase.from('otp_codes').insert({ email, code, purpose: 'login' });
      await callEmail('otp_login', email, { name: profile.first_name, code });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (body.action === 'verify_otp') {
    const email = String(body.email || '').toLowerCase().trim();
    const code = String(body.code || '').trim();
    if (!email || !code) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: row } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email).eq('code', code).eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    if (!row) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid or expired code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await supabase.from('otp_codes').update({ used: true }).eq('id', row.id);
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (body.action === 'send_welcome') {
    const email = String(body.email || '').toLowerCase().trim();
    if (email.includes('@')) {
      await callEmail('welcome', email, { name: body.name });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
