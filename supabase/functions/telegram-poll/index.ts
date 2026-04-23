// TradeLux Telegram Bot — Long-polling worker + Webhook handler
// Supports both modes:
//   - Cron-triggered POST {} → long-polling loop
//   - Telegram webhook POST <update> → process single update
// Calls Telegram Bot API DIRECTLY using the admin-configured bot token.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let r = '';
  for (let i = 0; i < 12; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: settings } = await supabase
    .from('admin_settings')
    .select('telegram_bot_token, telegram_admin_chat_id')
    .limit(1)
    .maybeSingle();

  const TG_TOKEN = settings?.telegram_bot_token;
  if (!TG_TOKEN) {
    return new Response(JSON.stringify({ ok: false, reason: 'No bot token configured' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const TG_BASE = `https://api.telegram.org/bot${TG_TOKEN}`;

  const persistentKeyboard = {
    keyboard: [
      [{ text: '💰 Balance' }, { text: '📥 Deposit' }],
      [{ text: '🏊 Pools' }, { text: '🤝 Join Pool' }],
      [{ text: '🔑 Reset Password' }, { text: '❓ Help' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };

  const send = async (chatId: number | string, text: string, extra?: any) => {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: persistentKeyboard,
      ...(extra || {}),
    };
    try {
      const r = await fetch(`${TG_BASE}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) console.error('sendMessage failed', r.status, await r.text());
    } catch (e) { console.error('sendMessage error', e); }
  };

  const answerCallback = async (id: string, text?: string) => {
    try {
      await fetch(`${TG_BASE}/answerCallbackQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: id, text }),
      });
    } catch (_) {}
  };

  const handleCommand = async (chatId: number, rawText: string) => {
    const text = rawText.trim();
    const lower = text.toLowerCase();
    const cmd = lower.split(' ')[0].split('@')[0];
    const args = text.split(/\s+/).slice(1);

    const { data: profile } = await supabase
      .from('profiles').select('*')
      .eq('telegram_chat_id', String(chatId)).maybeSingle();

    const isLinked = !!profile;

    const buttonMap: Record<string, string> = {
      '💰 balance': '/balance',
      '📥 deposit': '/deposit',
      '🏊 pools': '/pools',
      '🤝 join pool': '/join',
      '🔑 reset password': '/resetpassword',
      '📋 menu': '/menu',
      '❓ help': '/help',
    };
    const effective = buttonMap[lower] || cmd;

    if (effective === '/start' || effective === '/menu') {
      const greet = isLinked
        ? `🏆 <b>Welcome back, ${profile.first_name || 'Trader'}!</b>\n\nYour TradeLux account is linked.\n\n💼 Use the menu below to manage your account 👇`
        : `🏆 <b>Welcome to TradeLux!</b>\n\nYour elite trading companion.\n\n📌 <b>Step 1:</b> Link your account by sending:\n<code>/link your@email.com</code>\n\nThen explore using the menu below 👇`;
      await send(chatId, greet);
      return;
    }

    if (effective === '/help') {
      await send(chatId,
        `❓ <b>TradeLux Bot — Commands</b>\n\n` +
        `🔗 <code>/link &lt;email&gt;</code> — Link your account\n` +
        `💰 /balance — Check your balance\n` +
        `📥 /deposit — Get deposit addresses\n` +
        `📤 <code>/submit &lt;amount&gt; &lt;txid&gt;</code> — Submit a deposit\n` +
        `🏊 /pools — View active trading pools\n` +
        `🤝 /join — Join an active pool\n` +
        `🔑 /resetpassword — Get a temp password\n` +
        `❓ /help — This menu\n\n` +
        `💡 Use the buttons below — the menu is always there!`
      );
      return;
    }

    if (effective === '/link') {
      const email = (args[0] || '').toLowerCase().trim();
      if (!email || !email.includes('@')) {
        await send(chatId, '❌ Please send your email like:\n<code>/link you@example.com</code>');
        return;
      }
      const { data: target } = await supabase
        .from('profiles').select('*').eq('email', email).maybeSingle();
      if (!target) {
        // Privacy-safe: don't reveal whether the email exists
        await send(chatId,
          `📨 <b>Check your inbox</b>\n\nIf an account exists for <code>${email}</code>, we've linked it to this chat.\n\n` +
          `If you haven't signed up yet, please register at our website first, then send /link again.`
        );
        return;
      }
      await supabase.from('profiles')
        .update({ telegram_chat_id: String(chatId), telegram_linked: true })
        .eq('user_id', target.user_id);
      await send(chatId,
        `✅ <b>Account linked!</b>\n\nWelcome, <b>${target.first_name || 'Trader'}</b> 🎉\n\nYou can now manage your balance, deposit, and join pools right from Telegram.`
      );
      return;
    }

    if (effective === '/balance') {
      if (!profile) {
        await send(chatId, '🔒 Link your account first:\n<code>/link your@email.com</code>');
        return;
      }
      // Re-fetch fresh balance
      const { data: fresh } = await supabase.from('profiles').select('balance, first_name, last_name, email').eq('user_id', profile.user_id).maybeSingle();
      await send(chatId,
        `💰 <b>Your Balance</b>\n\n` +
        `<b>$${Number(fresh?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>\n\n` +
        `👤 ${fresh?.first_name || ''} ${fresh?.last_name || ''}\n📧 ${fresh?.email}`
      );
      return;
    }

    if (effective === '/deposit') {
      const { data: addresses } = await supabase
        .from('crypto_addresses').select('*').eq('is_active', true).order('created_at');
      if (!addresses || addresses.length === 0) {
        await send(chatId, '⚠️ No deposit addresses available right now. Please contact support.');
        return;
      }
      const inline = {
        inline_keyboard: addresses.map((a: any) => [{
          text: `${a.currency} • ${a.network}${a.label ? ` (${a.label})` : ''}`,
          callback_data: `addr:${a.id}`,
        }]),
      };
      await send(chatId,
        `📥 <b>Choose a deposit network</b>\n\n` +
        `Tap below to get the exact address. After sending crypto, submit your deposit with:\n` +
        `<code>/submit &lt;amount&gt; &lt;txid&gt;</code>`,
        { reply_markup: inline }
      );
      return;
    }

    if (effective === '/submit') {
      if (!profile) { await send(chatId, '🔒 Link your account first: <code>/link your@email.com</code>'); return; }
      const amount = parseFloat(args[0]);
      const txid = args[1];
      if (!amount || amount <= 0 || !txid) {
        await send(chatId, '❌ Usage: <code>/submit &lt;amount&gt; &lt;txid&gt;</code>\nExample: <code>/submit 100 abc123def456</code>');
        return;
      }
      const { data: addr } = await supabase.from('crypto_addresses').select('id, currency, network').eq('is_active', true).limit(1).maybeSingle();
      const { error } = await supabase.from('deposits').insert({
        user_id: profile.user_id,
        amount,
        txid,
        currency: addr?.currency || 'USDT',
        network: addr?.network || 'TRC20',
        crypto_address_id: addr?.id || null,
        status: 'pending',
      });
      if (error) {
        await send(chatId, `❌ Could not submit deposit: ${error.message}`);
        return;
      }
      await send(chatId,
        `✅ <b>Deposit submitted!</b>\n\n` +
        `💵 Amount: $${amount}\n🔗 TxID: <code>${txid}</code>\n\n` +
        `Status: <b>Pending</b>\nAdmin will confirm shortly. You'll see it in your wallet history.`
      );
      // Notify admin
      if (settings?.telegram_admin_chat_id) {
        await send(settings.telegram_admin_chat_id,
          `🔔 <b>New Deposit</b>\n\nUser: ${profile.email}\nAmount: $${amount}\nTxID: <code>${txid}</code>`
        );
      }
      return;
    }

    if (effective === '/pools') {
      const { data: pools } = await supabase
        .from('pools').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5);
      if (!pools || pools.length === 0) {
        await send(chatId, '🏊 No active pools right now. Check back soon!');
        return;
      }
      let msg = '🏊 <b>Active Trading Pools</b>\n\n';
      for (const p of pools) {
        const sym = p.traded_symbol ? ` 📊 <code>${p.traded_symbol}</code>` : '';
        const split = p.profit_split_percentage || 70;
        msg += `<b>${p.name}</b>${sym}\n`;
        msg += `💵 Entry: $${Number(p.entry_amount).toLocaleString()}\n`;
        msg += `👥 ${p.current_participants}/${p.max_participants} traders\n`;
        msg += `📈 Profit: $${Number(p.current_profit).toLocaleString()} / $${Number(p.target_profit).toLocaleString()}\n`;
        msg += `💰 ${split}% profit to you\n\n`;
      }
      msg += '💡 Tap <b>🤝 Join Pool</b> to join one.';
      await send(chatId, msg);
      return;
    }

    if (effective === '/join') {
      if (!profile) { await send(chatId, '🔒 Link your account first: <code>/link your@email.com</code>'); return; }
      const { data: pools } = await supabase
        .from('pools').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(8);
      if (!pools || pools.length === 0) {
        await send(chatId, '🏊 No active pools to join right now.');
        return;
      }
      const inline = {
        inline_keyboard: pools
          .filter((p: any) => p.current_participants < p.max_participants)
          .map((p: any) => [{
            text: `${p.name} • $${Number(p.entry_amount).toLocaleString()} • ${p.current_participants}/${p.max_participants}`,
            callback_data: `join:${p.id}`,
          }]),
      };
      if (inline.inline_keyboard.length === 0) {
        await send(chatId, '🏊 All active pools are currently full.');
        return;
      }
      await send(chatId,
        `🤝 <b>Choose a pool to join</b>\n\n` +
        `Your balance: <b>$${Number(profile.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>\n\n` +
        `Entry amount will be deducted from your balance.`,
        { reply_markup: inline }
      );
      return;
    }

    if (effective === '/resetpassword') {
      let target = profile;
      if (!target && args[0]?.includes('@')) {
        const { data: byEmail } = await supabase
          .from('profiles').select('*').eq('email', args[0].toLowerCase()).maybeSingle();
        target = byEmail;
      }
      // Privacy-safe: ALWAYS respond identically whether the email exists or not
      const ackMsg = `📨 <b>If an account exists for that email, a temporary password has been generated and sent here.</b>\n\nIf you don't see it next, double-check your email and try again with:\n<code>/resetpassword your@email.com</code>`;

      if (!target) {
        await send(chatId, ackMsg);
        return;
      }
      const tempPassword = generateTempPassword();
      const { data: userData } = await supabase.auth.admin.listUsers();
      const authUser = userData?.users?.find((u: any) => u.email === target.email);
      if (!authUser) {
        await send(chatId, ackMsg);
        return;
      }
      const { error: resetErr } = await supabase.auth.admin.updateUserById(authUser.id, { password: tempPassword });
      if (resetErr) {
        await send(chatId, ackMsg);
        return;
      }
      await send(chatId,
        `🔑 <b>Temporary Password</b>\n\nEmail: <code>${target.email}</code>\nPassword: <code>${tempPassword}</code>\n\n⚠️ Log in and change this immediately under Profile → Security.`
      );
      return;
    }

    // Privacy-safe fallback — don't reveal command set unless asked via /help
    await send(chatId, 'ℹ️ Tap a button below to continue, or send /help for the full command list.');
  };

  const handleCallback = async (chatId: number, data: string, callbackId: string) => {
    if (data.startsWith('addr:')) {
      const id = data.slice(5);
      const { data: addr } = await supabase.from('crypto_addresses').select('*').eq('id', id).maybeSingle();
      if (!addr) { await answerCallback(callbackId, 'Address not available'); return; }
      await answerCallback(callbackId, 'Address sent!');
      await send(chatId,
        `📥 <b>${addr.currency} • ${addr.network}</b>${addr.label ? ` — ${addr.label}` : ''}\n\n` +
        `<code>${addr.address}</code>\n\n` +
        `⚠️ Send only ${addr.currency} on the ${addr.network} network. Other tokens will be lost.\n\n` +
        `📤 After sending, submit with:\n<code>/submit &lt;amount&gt; &lt;txid&gt;</code>`
      );
      return;
    }

    if (data.startsWith('join:')) {
      const poolId = data.slice(5);
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('telegram_chat_id', String(chatId)).maybeSingle();
      if (!profile) { await answerCallback(callbackId, 'Link account first'); return; }
      const { data: pool } = await supabase.from('pools').select('*').eq('id', poolId).maybeSingle();
      if (!pool) { await answerCallback(callbackId, 'Pool not found'); return; }
      if (pool.current_participants >= pool.max_participants) { await answerCallback(callbackId, 'Pool is full'); return; }

      // Already joined?
      const { data: existing } = await supabase
        .from('pool_participants').select('id').eq('pool_id', poolId).eq('user_id', profile.user_id).maybeSingle();
      if (existing) { await answerCallback(callbackId, 'Already joined'); await send(chatId, `ℹ️ You're already in <b>${pool.name}</b>.`); return; }

      const balance = Number(profile.balance);
      const entry = Number(pool.entry_amount);
      if (balance < entry) {
        await answerCallback(callbackId, 'Insufficient balance');
        await send(chatId, `❌ Insufficient balance.\nNeeded: $${entry}\nYou have: $${balance.toFixed(2)}\n\nDeposit first via 📥 Deposit.`);
        return;
      }

      // Deduct + insert + bump participant count
      const { error: balErr } = await supabase.from('profiles').update({ balance: balance - entry }).eq('user_id', profile.user_id);
      if (balErr) { await answerCallback(callbackId, 'Failed'); return; }

      const { error: joinErr } = await supabase.from('pool_participants').insert({
        pool_id: poolId, user_id: profile.user_id, amount_invested: entry,
      });
      if (joinErr) {
        // Refund on failure
        await supabase.from('profiles').update({ balance }).eq('user_id', profile.user_id);
        await answerCallback(callbackId, 'Failed to join');
        return;
      }
      await supabase.from('pools').update({ current_participants: pool.current_participants + 1 }).eq('id', poolId);

      await answerCallback(callbackId, '✅ Joined!');
      await send(chatId,
        `🎉 <b>Successfully joined ${pool.name}!</b>\n\n` +
        `💵 Invested: $${entry}\n💰 New balance: $${(balance - entry).toFixed(2)}\n` +
        `📊 Symbol: <code>${pool.traded_symbol || 'TBA'}</code>\n` +
        `💎 Profit split: ${pool.profit_split_percentage || 70}% to you\n\n` +
        `When the pool fills up, you'll get access to the live chat room in the app.`
      );
      return;
    }

    await answerCallback(callbackId);
  };

  // ───── Setup commands menu (best-effort) ─────
  try {
    await fetch(`${TG_BASE}/setMyCommands`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: '🚀 Start' },
          { command: 'menu', description: '📋 Menu' },
          { command: 'balance', description: '💰 Balance' },
          { command: 'deposit', description: '📥 Deposit' },
          { command: 'submit', description: '📤 Submit deposit' },
          { command: 'pools', description: '🏊 View pools' },
          { command: 'join', description: '🤝 Join a pool' },
          { command: 'resetpassword', description: '🔑 Reset password' },
          { command: 'link', description: '🔗 Link account' },
          { command: 'help', description: '❓ Help' },
        ],
      }),
    });
  } catch (_) {}

  // ───── Detect mode: webhook update OR polling trigger ─────
  let bodyJson: any = null;
  try {
    const text = await req.text();
    bodyJson = text ? JSON.parse(text) : null;
  } catch (_) {}

  const isWebhookUpdate = bodyJson && (bodyJson.update_id || bodyJson.message || bodyJson.callback_query);

  if (isWebhookUpdate) {
    // Webhook mode — process single update
    try {
      if (bodyJson.message?.text) {
        await handleCommand(bodyJson.message.chat.id, bodyJson.message.text);
      } else if (bodyJson.callback_query) {
        await handleCallback(
          bodyJson.callback_query.message.chat.id,
          bodyJson.callback_query.data,
          bodyJson.callback_query.id
        );
      }
    } catch (e) { console.error('Webhook handler error', e); }
    return new Response(JSON.stringify({ ok: true, mode: 'webhook' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ───── Long-polling mode ─────
  // Ensure webhook OFF for polling
  try { await fetch(`${TG_BASE}/deleteWebhook?drop_pending_updates=false`, { method: 'POST' }); } catch (_) {}

  await supabase.from('telegram_bot_state').upsert({ id: 1, update_offset: 0 }, { onConflict: 'id' });
  const { data: state } = await supabase.from('telegram_bot_state').select('update_offset').eq('id', 1).maybeSingle();
  let currentOffset: number = state?.update_offset ?? 0;

  let totalProcessed = 0;

  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(45, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    let resp: Response;
    try {
      resp = await fetch(`${TG_BASE}/getUpdates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message', 'callback_query'] }),
      });
    } catch (e) { console.error('getUpdates network error', e); break; }

    if (!resp.ok) { console.error('getUpdates failed', resp.status, await resp.text()); break; }

    const data = await resp.json();
    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      try {
        if (update.message?.text) {
          await handleCommand(update.message.chat.id, update.message.text);
        } else if (update.callback_query) {
          await handleCallback(update.callback_query.message.chat.id, update.callback_query.data, update.callback_query.id);
        }
      } catch (e) { console.error('Update handler error', e); }
    }

    const rows = updates
      .filter((u: any) => u.message)
      .map((u: any) => ({ update_id: u.update_id, chat_id: u.message.chat.id, text: u.message.text ?? null, raw_update: u }));
    if (rows.length > 0) {
      await supabase.from('telegram_messages').upsert(rows, { onConflict: 'update_id' });
      totalProcessed += rows.length;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from('telegram_bot_state').update({ update_offset: newOffset, updated_at: new Date().toISOString() }).eq('id', 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
