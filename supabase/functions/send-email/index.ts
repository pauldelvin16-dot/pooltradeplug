// TradeLux SMTP sender — full handshake (EHLO → AUTH LOGIN → MAIL FROM → RCPT TO → DATA → QUIT)
// Reads SMTP config from admin_settings. Renders branded HTML templates.
// Public endpoint (verify_jwt = false) called from triggers and other functions.
// Origin (for password reset / verify links) is taken from the request body or the Origin header — never hardcoded.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TemplateName =
  | 'welcome'
  | 'password_reset'
  | 'otp_login'
  | 'deposit_received'
  | 'deposit_confirmed'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'pool_joined'
  | 'pool_completed'
  | 'generic';

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
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;color:#0a0d14;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#0a0d14;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.15);">
        <tr><td style="padding:32px 32px 16px 32px;text-align:center;background:linear-gradient(135deg,#1a1f2e 0%,#0a0d14 100%);">
          <div style="font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#EAB308;letter-spacing:1px;">${escape(brandName)}</div>
          <div style="font-size:11px;letter-spacing:3px;color:#9ca3af;margin-top:4px;text-transform:uppercase;">Luxury Trading Platform</div>
        </td></tr>
        <tr><td style="padding:32px;background:#0a0d14;color:#e5e7eb;">
          <h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;color:#EAB308;">${escape(title)}</h1>
          <div style="font-size:15px;line-height:1.6;color:#d1d5db;">${body}</div>
          ${ctaText && ctaUrl ? `
          <div style="text-align:center;margin:32px 0 16px;">
            <a href="${escape(ctaUrl)}" style="display:inline-block;background:linear-gradient(135deg,#EAB308 0%,#F59E0B 100%);color:#0a0d14;font-weight:bold;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;box-shadow:0 4px 14px rgba(234,179,8,0.4);">${escape(ctaText)}</a>
          </div>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#06080d;border-top:1px solid #1f2937;text-align:center;font-size:12px;color:#6b7280;">
          <p style="margin:0 0 6px;">Sent from <a href="${escape(siteUrl)}" style="color:#EAB308;text-decoration:none;">${escape(siteUrl.replace(/^https?:\/\//, ''))}</a></p>
          <p style="margin:0;">© ${new Date().getFullYear()} ${escape(brandName)}. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

function render(template: TemplateName, data: Record<string, any>, siteUrl: string, brandName: string): { subject: string; html: string } {
  const name = data.name || data.first_name || 'Trader';
  switch (template) {
    case 'welcome':
      return {
        subject: `Welcome to ${brandName} — Your Elite Trading Journey Begins`,
        html: baseTemplate(siteUrl, brandName, `Welcome, ${escape(name)}!`,
          `<p>You've joined an exclusive community of traders leveraging premium MT5 infrastructure and pooled trading strategies.</p>
           <p><strong>Next steps:</strong></p>
           <ul style="color:#d1d5db;">
             <li>Make your first deposit to unlock pool access</li>
             <li>Browse active pools and pick your strategy</li>
             <li>Link Telegram for instant notifications</li>
           </ul>`,
          'Open Dashboard', `${siteUrl}/dashboard`),
      };
    case 'password_reset':
      return {
        subject: `Reset your ${brandName} password`,
        html: baseTemplate(siteUrl, brandName, 'Password Reset Request',
          `<p>Hi ${escape(name)},</p>
           <p>We received a request to reset your password. Click the button below to set a new one. This link expires in 1 hour.</p>
           <p style="color:#9ca3af;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>`,
          'Reset Password', data.reset_url || `${siteUrl}/login`),
      };
    case 'otp_login':
      return {
        subject: `Your ${brandName} login code: ${data.code}`,
        html: baseTemplate(siteUrl, brandName, 'Your Login Code',
          `<p>Hi ${escape(name)},</p>
           <p>Use this one-time code to complete sign-in:</p>
           <div style="text-align:center;margin:24px 0;">
             <div style="display:inline-block;background:#1a1f2e;border:2px solid #EAB308;border-radius:12px;padding:20px 36px;font-family:'Courier New',monospace;font-size:32px;letter-spacing:8px;color:#EAB308;font-weight:bold;">${escape(data.code)}</div>
           </div>
           <p style="color:#9ca3af;font-size:13px;">Code expires in 10 minutes. Never share it with anyone.</p>`),
      };
    case 'deposit_received':
      return {
        subject: `Deposit received — pending confirmation`,
        html: baseTemplate(siteUrl, brandName, 'Deposit Submitted',
          `<p>Hi ${escape(name)},</p>
           <p>We've received your deposit submission:</p>
           <div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;">
             <p style="margin:0 0 8px;"><strong>Amount:</strong> $${escape(data.amount)}</p>
             <p style="margin:0 0 8px;"><strong>Network:</strong> ${escape(data.network)}</p>
             <p style="margin:0;"><strong>TXID:</strong> <code style="color:#EAB308;font-size:12px;">${escape(data.txid)}</code></p>
           </div>
           <p>Our team will confirm on-chain and credit your balance shortly.</p>`,
          'View Wallet', `${siteUrl}/dashboard/wallet`),
      };
    case 'deposit_confirmed':
      return {
        subject: `✅ Deposit confirmed — $${data.amount} credited`,
        html: baseTemplate(siteUrl, brandName, 'Deposit Confirmed!',
          `<p>Hi ${escape(name)},</p>
           <p>Great news — your deposit of <strong style="color:#EAB308;">$${escape(data.amount)}</strong> has been confirmed and credited to your account.</p>
           <p>You can now join active pools or hold funds for upcoming opportunities.</p>`,
          'Browse Pools', `${siteUrl}/dashboard/pools`),
      };
    case 'withdrawal_requested':
      return {
        subject: `Withdrawal request received — $${data.amount}`,
        html: baseTemplate(siteUrl, brandName, 'Withdrawal Submitted',
          `<p>Hi ${escape(name)},</p>
           <p>Your withdrawal request is being reviewed:</p>
           <div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;">
             <p style="margin:0 0 8px;"><strong>Amount:</strong> $${escape(data.amount)}</p>
             <p style="margin:0 0 8px;"><strong>Network:</strong> ${escape(data.network)}</p>
             <p style="margin:0;"><strong>To:</strong> <code style="color:#EAB308;font-size:11px;">${escape(data.wallet_address)}</code></p>
           </div>
           <p>Approvals are typically processed within 24 hours.</p>`,
          'View Status', `${siteUrl}/dashboard/wallet`),
      };
    case 'withdrawal_completed':
      return {
        subject: `✅ Withdrawal sent — $${data.amount}`,
        html: baseTemplate(siteUrl, brandName, 'Withdrawal Completed',
          `<p>Hi ${escape(name)},</p>
           <p>Your withdrawal of <strong style="color:#EAB308;">$${escape(data.amount)}</strong> has been sent on the ${escape(data.network)} network.</p>
           <p>Funds should arrive in your wallet within minutes depending on network congestion.</p>`),
      };
    case 'pool_joined':
      return {
        subject: `🤝 You joined ${data.pool_name}`,
        html: baseTemplate(siteUrl, brandName, `Welcome to ${escape(data.pool_name)}`,
          `<p>Hi ${escape(name)},</p>
           <p>You've successfully joined the pool:</p>
           <div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;">
             <p style="margin:0 0 8px;"><strong>Pool:</strong> ${escape(data.pool_name)}</p>
             <p style="margin:0 0 8px;"><strong>Investment:</strong> $${escape(data.amount)}</p>
             <p style="margin:0;"><strong>Symbol:</strong> ${escape(data.symbol || 'TBA')}</p>
           </div>
           <p>Once the pool fills, you'll get access to the live chat room with other participants.</p>`,
          'View Pool', `${siteUrl}/dashboard/pools`),
      };
    case 'pool_completed':
      return {
        subject: `🏆 Pool completed — Your share: $${data.profit}`,
        html: baseTemplate(siteUrl, brandName, 'Pool Trade Completed!',
          `<p>Hi ${escape(name)},</p>
           <p>The <strong>${escape(data.pool_name)}</strong> pool has closed. Your profit share has been credited.</p>
           <div style="background:#1a1f2e;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
             <div style="color:#9ca3af;font-size:13px;">Your share</div>
             <div style="color:#EAB308;font-size:32px;font-weight:bold;font-family:Georgia,serif;">$${escape(data.profit)}</div>
           </div>`,
          'Withdraw or Reinvest', `${siteUrl}/dashboard/wallet`),
      };
    default:
      return {
        subject: data.subject || `Message from ${brandName}`,
        html: baseTemplate(siteUrl, brandName, data.subject || 'Notification', `<p>${escape(data.message || '')}</p>`),
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!body.to || !body.template) {
    return new Response(JSON.stringify({ error: 'Missing to or template' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Dynamic origin — no hardcoded domain
  const origin = body.origin || req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || 'https://app.example.com';
  const siteUrl = origin.replace(/\/$/, '');

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('smtp_host, smtp_port, smtp_secure, smtp_username, smtp_password, smtp_from_email, smtp_from_name, smtp_enabled')
    .limit(1)
    .maybeSingle();

  if (!settings?.smtp_enabled || !settings?.smtp_host || !settings?.smtp_username || !settings?.smtp_password || !settings?.smtp_from_email) {
    await supabase.from('email_log').insert({ to_email: body.to, subject: body.subject || body.template, template: body.template, status: 'skipped', error: 'SMTP not configured' });
    return new Response(JSON.stringify({ ok: false, reason: 'SMTP not configured' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const brandName = settings.smtp_from_name || 'TradeLux';
  const { subject, html } = render(body.template, body.data || {}, siteUrl, brandName);

  // Full SMTP handshake via denomailer (EHLO → STARTTLS/TLS → AUTH LOGIN → MAIL FROM → RCPT TO → DATA → QUIT)
  const client = new SMTPClient({
    connection: {
      hostname: settings.smtp_host,
      port: settings.smtp_port || 587,
      tls: !!settings.smtp_secure, // true for port 465 (implicit TLS), false for 587 (STARTTLS handled automatically)
      auth: {
        username: settings.smtp_username,
        password: settings.smtp_password,
      },
    },
  });

  try {
    await client.send({
      from: `${brandName} <${settings.smtp_from_email}>`,
      to: body.to,
      subject,
      content: 'auto',
      html,
    });
    await client.close();
    await supabase.from('email_log').insert({ to_email: body.to, subject, template: body.template, status: 'sent' });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    try { await client.close(); } catch (_) {}
    console.error('SMTP send failed', e);
    await supabase.from('email_log').insert({ to_email: body.to, subject, template: body.template, status: 'failed', error: String(e?.message || e) });
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
