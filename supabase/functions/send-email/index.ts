// TradeLux SMTP sender — uses Nodemailer (npm) for robust SSL/TLS + STARTTLS handshakes.
// Auto-negotiates: port 465 → implicit TLS (secure:true); port 587/25 → STARTTLS (secure:false, requireTLS:true).
// Tolerates self-signed certs commonly used by shared hosting (cPanel/Plesk).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TemplateName =
  | 'welcome' | 'password_reset' | 'otp_login'
  | 'deposit_received' | 'deposit_confirmed'
  | 'withdrawal_requested' | 'withdrawal_completed'
  | 'pool_joined' | 'pool_completed' | 'generic';

interface SendBody {
  to: string;
  template: TemplateName;
  data?: Record<string, any>;
  origin?: string;
  subject?: string;
}

const escape = (v: any) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );

const baseTemplate = (siteUrl: string, brandName: string, title: string, body: string, ctaText?: string, ctaUrl?: string) => `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;color:#0a0d14;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#0a0d14;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#1a1f2e,#0a0d14);">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#EAB308;">${escape(brandName)}</div>
          <div style="font-size:11px;letter-spacing:3px;color:#9ca3af;margin-top:4px;text-transform:uppercase;">Luxury Trading Platform</div>
        </td></tr>
        <tr><td style="padding:32px;background:#0a0d14;color:#e5e7eb;">
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#EAB308;">${escape(title)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#d1d5db;">${body}</div>
          ${ctaText && ctaUrl ? `<div style="text-align:center;margin:32px 0 16px;"><a href="${escape(ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,#EAB308,#F59E0B);color:#0a0d14;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;">${escape(ctaText)}</a></div>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#06080d;border-top:1px solid #1f2937;text-align:center;font-size:12px;color:#6b7280;">
          <p style="margin:0 0 6px;">Sent from <a href="${escape(siteUrl)}" style="color:#EAB308;text-decoration:none;">${escape(siteUrl.replace(/^https?:\/\//,''))}</a></p>
          <p style="margin:0;">© ${new Date().getFullYear()} ${escape(brandName)}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

function render(template: TemplateName, data: Record<string, any>, siteUrl: string, brandName: string): { subject: string; html: string } {
  const name = data.name || data.first_name || 'Trader';
  switch (template) {
    case 'welcome':
      return { subject: `Welcome to ${brandName}`, html: baseTemplate(siteUrl, brandName, `Welcome, ${escape(name)}!`,
        `<p>You've joined an exclusive community of traders.</p><p><strong>Next steps:</strong></p><ul style="color:#d1d5db;"><li>Make your first deposit</li><li>Browse pools</li><li>Link Telegram</li></ul>`,
        'Open Dashboard', `${siteUrl}/dashboard`) };
    case 'password_reset':
      return { subject: `Reset your ${brandName} password`, html: baseTemplate(siteUrl, brandName, 'Password Reset Request',
        `<p>Hi ${escape(name)},</p><p>Click the button below to set a new password. This link expires in 1 hour.</p><p style="color:#9ca3af;font-size:13px;">If you didn't request this, you can ignore this email.</p>`,
        'Reset Password', data.reset_url || `${siteUrl}/login`) };
    case 'otp_login':
      return { subject: `Your ${brandName} login code: ${data.code}`, html: baseTemplate(siteUrl, brandName, 'Your Login Code',
        `<p>Hi ${escape(name)},</p><p>Use this one-time code to complete sign-in:</p><div style="text-align:center;margin:24px 0;"><div style="display:inline-block;background:#1a1f2e;border:2px solid #EAB308;border-radius:12px;padding:20px 36px;font-family:'Courier New',monospace;font-size:32px;letter-spacing:8px;color:#EAB308;font-weight:bold;">${escape(data.code)}</div></div><p style="color:#9ca3af;font-size:13px;">Code expires in 10 minutes.</p>`) };
    case 'deposit_received':
      return { subject: `Deposit received — pending`, html: baseTemplate(siteUrl, brandName, 'Deposit Submitted',
        `<p>Hi ${escape(name)},</p><div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;"><p style="margin:0 0 8px;"><strong>Amount:</strong> $${escape(data.amount)}</p><p style="margin:0 0 8px;"><strong>Network:</strong> ${escape(data.network)}</p><p style="margin:0;"><strong>TXID:</strong> <code style="color:#EAB308;font-size:12px;">${escape(data.txid)}</code></p></div>`,
        'View Wallet', `${siteUrl}/dashboard/wallet`) };
    case 'deposit_confirmed':
      return { subject: `✅ Deposit confirmed — $${data.amount}`, html: baseTemplate(siteUrl, brandName, 'Deposit Confirmed!',
        `<p>Hi ${escape(name)},</p><p>Your deposit of <strong style="color:#EAB308;">$${escape(data.amount)}</strong> has been credited.</p>`,
        'Browse Pools', `${siteUrl}/dashboard/pools`) };
    case 'withdrawal_requested':
      return { subject: `Withdrawal request — $${data.amount}`, html: baseTemplate(siteUrl, brandName, 'Withdrawal Submitted',
        `<p>Hi ${escape(name)},</p><div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;"><p style="margin:0 0 8px;"><strong>Amount:</strong> $${escape(data.amount)}</p><p style="margin:0;"><strong>To:</strong> <code style="color:#EAB308;font-size:11px;">${escape(data.wallet_address)}</code></p></div>`,
        'View Status', `${siteUrl}/dashboard/wallet`) };
    case 'withdrawal_completed':
      return { subject: `✅ Withdrawal sent — $${data.amount}`, html: baseTemplate(siteUrl, brandName, 'Withdrawal Completed',
        `<p>Hi ${escape(name)},</p><p>Your withdrawal of <strong style="color:#EAB308;">$${escape(data.amount)}</strong> has been sent on ${escape(data.network)}.</p>`) };
    case 'pool_joined':
      return { subject: `🤝 You joined ${data.pool_name}`, html: baseTemplate(siteUrl, brandName, `Welcome to ${escape(data.pool_name)}`,
        `<p>Hi ${escape(name)},</p><div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;"><p style="margin:0 0 8px;"><strong>Pool:</strong> ${escape(data.pool_name)}</p><p style="margin:0;"><strong>Investment:</strong> $${escape(data.amount)}</p></div>`,
        'View Pool', `${siteUrl}/dashboard/pools`) };
    case 'pool_completed':
      return { subject: `🏆 Pool completed — $${data.profit}`, html: baseTemplate(siteUrl, brandName, 'Pool Completed!',
        `<p>Hi ${escape(name)},</p><div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;text-align:center;"><div style="color:#9ca3af;font-size:13px;">Your share</div><div style="color:#EAB308;font-size:32px;font-weight:bold;">$${escape(data.profit)}</div></div>`,
        'Withdraw or Reinvest', `${siteUrl}/dashboard/wallet`) };
    default:
      return { subject: data.subject || `Message from ${brandName}`, html: baseTemplate(siteUrl, brandName, data.subject || 'Notification', `<p>${escape(data.message || '')}</p>`) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: SendBody;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  if (!body.to || !body.template) {
    return new Response(JSON.stringify({ error: 'Missing to or template' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const origin = body.origin || req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || '';
  const siteUrl = origin.replace(/\/$/, '');

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password, smtp_from_email, smtp_from_name, smtp_enabled')
    .limit(1).maybeSingle();

  if (!settings?.smtp_enabled || !settings?.smtp_host || !settings?.smtp_username || !settings?.smtp_password || !settings?.smtp_from_email) {
    await supabase.from('email_log').insert({ to_email: body.to, subject: body.subject || body.template, template: body.template, status: 'skipped', error: 'SMTP not configured' });
    return new Response(JSON.stringify({ ok: false, reason: 'SMTP not configured' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const brandName = settings.smtp_from_name || 'TradeLux';
  const { subject, html } = render(body.template, body.data || {}, siteUrl, brandName);

  // Auto-negotiate TLS based on port (overridable via smtp_secure):
  //   465 → implicit TLS (secure:true)
  //   587 / 25 / 2525 → STARTTLS (secure:false, requireTLS:true)
  const port = settings.smtp_port || 587;
  const explicitSecure = settings.smtp_secure;
  const secure = typeof explicitSecure === 'boolean' ? explicitSecure : port === 465;

  const transporter = nodemailer.createTransport({
    host: settings.smtp_host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user: settings.smtp_username, pass: settings.smtp_password },
    tls: {
      // Many shared-hosting providers use self-signed or hostname-mismatched certs.
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  try {
    const info = await transporter.sendMail({
      from: `"${brandName}" <${settings.smtp_from_email}>`,
      to: body.to,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000),
    });
    await supabase.from('email_log').insert({ to_email: body.to, subject, template: body.template, status: 'sent' });
    return new Response(JSON.stringify({ ok: true, messageId: info.messageId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('Nodemailer send failed', e);
    const errMsg = String(e?.message || e);
    await supabase.from('email_log').insert({ to_email: body.to, subject, template: body.template, status: 'failed', error: errMsg });
    return new Response(JSON.stringify({ ok: false, error: errMsg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
