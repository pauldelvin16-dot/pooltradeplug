// TradeLux Telegram Bot — Long-polling worker
// Calls Telegram Bot API DIRECTLY using the admin-configured bot token.
// No connector required. Idempotent via offset stored in telegram_bot_state.

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

  // Ensure bot state row
  await supabase.from('telegram_bot_state').upsert({ id: 1, update_offset: 0 }, { onConflict: 'id' });
  const { data: state } = await supabase
    .from('telegram_bot_state')
    .select('update_offset')
    .eq('id', 1)
    .maybeSingle();
  let currentOffset: number = state?.update_offset ?? 0;

  // Always make sure webhook is OFF (long-polling can't coexist with webhook)
  try {
    await fetch(`${TG_BASE}/deleteWebhook?drop_pending_updates=false`, { method: 'POST' });
  } catch (_) { /* ignore */ }

  // Set bot commands menu (so the / button shows nice list)
  try {
    await fetch(`${TG_BASE}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: '🚀 Start & link account' },
          { command: 'menu', description: '📋 Show menu' },
          { command: 'balance', description: '💰 Check balance' },
          { command: 'deposit', description: '📥 Get deposit address' },
          { command: 'pools', description: '🏊 Active trading pools' },
          { command: 'resetpassword', description: '🔑 Reset password' },
          { command: 'link', description: '🔗 Link account: /link email' },
          { command: 'help', description: '❓ Help' },
        ],
      }),
    });
  } catch (_) { /* ignore */ }

  const persistentKeyboard = {
    keyboard: [
      [{ text: '💰 Balance' }, { text: '📥 Deposit' }],
      [{ text: '🏊 Pools' }, { text: '🔑 Reset Password' }],
      [{ text: '📋 Menu' }, { text: '❓ Help' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };

  const send = async (chatId: number | string, text: string, extra?: any) => {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: persistentKeyboard, // ALWAYS attach persistent menu
      ...(extra || {}),
    };
    try {
      const r = await fetch(`${TG_BASE}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) console.error('sendMessage failed', r.status, await r.text());
    } catch (e) {
      console.error('sendMessage error', e);
    }
  };

  const handleCommand = async (chatId: number, rawText: string, firstName?: string) => {
    const text = rawText.trim();
    const lower = text.toLowerCase();
    const cmd = lower.split(' ')[0].split('@')[0]; // strip @botname
    const args = text.split(' ').slice(1);

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('telegram_chat_id', String(chatId))
      .maybeSingle();

    const isLinked = !!profile;

    // Map button labels to commands
    const buttonMap: Record<string, string> = {
      '💰 balance': '/balance',
      '📥 deposit': '/deposit',
      '🏊 pools': '/pools',
      '🔑 reset password': '/resetpassword',
      '📋 menu': '/menu',
      '❓ help': '/help',
    };
    const effective = buttonMap[lower] || cmd;

    if (effective === '/start' || effective === '/menu') {
      const greet = isLinked
        ? `🏆 <b>Welcome back, ${profile.first_name || 'Trader'}!</b>\n\nYour TradeLux account is linked. Use the menu below 👇`
        : `🏆 <b>Welcome to TradeLux!</b>\n\nYour elite trading companion.\n\n📌 <b>Link your account:</b>\n<code>/link your@email.com</code>\n\nThen explore using the menu below 👇`;
      await send(chatId, greet);
      return;
    }

    if (effective === '/help') {
      await send(chatId,
        `❓ <b>TradeLux Bot — Commands</b>\n\n` +
        `🔗 <code>/link &lt;email&gt;</code> — Link your account\n` +
        `💰 /balance — Check your balance\n` +
        `📥 /deposit — Get deposit addresses\n` +
        `🏊 /pools — View active trading pools\n` +
        `🔑 /resetpassword — Get a temporary password\n` +
        `📋 /menu — Show main menu\n` +
        `❓ /help — Show this help\n\n` +
        `💡 You can also tap the buttons below — the menu never disappears!`
      );
      return;
    }

    if (effective === '/link') {
      const email = (args[0] || '').toLowerCase().trim();
      if (!email || !email.includes('@')) {
        await send(chatId, '❌ Please send your email like this:\n<code>/link you@example.com</code>');
        return;
      }
      const { data: target } = await supabase
        .from('profiles').select('*').eq('email', email).maybeSingle();
      if (!target) {
        await send(chatId, `❌ No TradeLux account found for <code>${email}</code>.\n\nSign up first, then come back to /link.`);
        return;
      }
      const { error: linkErr } = await supabase.from('profiles')
        .update({ telegram_chat_id: String(chatId), telegram_linked: true })
        .eq('user_id', target.user_id);
      if (linkErr) {
        await send(chatId, '❌ Failed to link your account. Try again shortly.');
        return;
      }
      await send(chatId,
        `✅ <b>Account linked successfully!</b>\n\n` +
        `Welcome aboard, <b>${target.first_name || 'Trader'}</b> 🎉\n` +
        `You can now check your balance, deposit, or join pools right here.`
      );
      return;
    }

    // Below: features that may or may not require linking, handle gracefully
    if (effective === '/balance') {
      if (!profile) {
        await send(chatId, '🔒 Link your account first:\n<code>/link your@email.com</code>');
        return;
      }
      await send(chatId,
        `💰 <b>Your Balance</b>\n\n` +
        `<b>$${Number(profile.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>\n\n` +
        `👤 ${profile.first_name || ''} ${profile.last_name || ''}\n📧 ${profile.email}`
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
      // Send as inline keyboard so user can tap a network and receive that specific address
      const inline = {
        inline_keyboard: addresses.map((a: any) => [{
          text: `${a.currency} • ${a.network}${a.label ? ` (${a.label})` : ''}`,
          callback_data: `addr:${a.id}`,
        }]),
      };
      await send(chatId,
        `📥 <b>Choose a deposit network</b>\n\n` +
        `Tap a network below — I'll send you the exact address to copy.`,
        { reply_markup: inline }
      );
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
        msg += `💰 ${split}% profit split to you\n\n`;
      }
      msg += '💡 Open TradeLux web app to join a pool.';
      await send(chatId, msg);
      return;
    }

    if (effective === '/resetpassword') {
      // Allow reset by chat link OR by email argument
      let target = profile;
      if (!target && args[0]?.includes('@')) {
        const { data: byEmail } = await supabase
          .from('profiles').select('*').eq('email', args[0].toLowerCase()).maybeSingle();
        target = byEmail;
      }
      if (!target) {
        await send(chatId,
          `🔒 To reset your password, link your account first:\n<code>/link your@email.com</code>\n\n` +
          `Or send: <code>/resetpassword your@email.com</code>`
        );
        return;
      }
      const tempPassword = generateTempPassword();
      const { data: userData } = await supabase.auth.admin.listUsers();
      const authUser = userData?.users?.find((u: any) => u.email === target.email);
      if (!authUser) {
        await send(chatId, '❌ Could not find your auth account. Contact support.');
        return;
      }
      const { error: resetErr } = await supabase.auth.admin.updateUserById(authUser.id, { password: tempPassword });
      if (resetErr) {
        await send(chatId, '❌ Failed to reset password. Try again shortly.');
        return;
      }
      await send(chatId,
        `🔑 <b>Temporary Password Issued</b>\n\n` +
        `Email: <code>${target.email}</code>\n` +
        `Password: <code>${tempPassword}</code>\n\n` +
        `⚠️ Log in and change this password immediately under Profile → Security.`
      );
      return;
    }

    // Fallback
    await send(chatId, '🤔 I didn\'t recognise that. Tap a button below or send /help.');
  };

  const handleCallback = async (chatId: number, data: string, callbackId: string) => {
    if (data.startsWith('addr:')) {
      const id = data.slice(5);
      const { data: addr } = await supabase.from('crypto_addresses').select('*').eq('id', id).maybeSingle();
      if (!addr) {
        await fetch(`${TG_BASE}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId, text: 'Address not available' }),
        });
        return;
      }
      await fetch(`${TG_BASE}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text: 'Address sent!' }),
      });
      await send(chatId,
        `📥 <b>${addr.currency} • ${addr.network}</b>${addr.label ? ` — ${addr.label}` : ''}\n\n` +
        `<code>${addr.address}</code>\n\n` +
        `⚠️ Send only ${addr.currency} on the ${addr.network} network. Other tokens will be lost.\n` +
        `Deposits are credited after admin confirmation.`
      );
    }
  };

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offset: currentOffset,
          timeout,
          allowed_updates: ['message', 'callback_query'],
        }),
      });
    } catch (e) {
      console.error('getUpdates network error', e);
      break;
    }

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('getUpdates failed', resp.status, errText);
      break;
    }

    const data = await resp.json();
    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      try {
        if (update.message?.text) {
          await handleCommand(
            update.message.chat.id,
            update.message.text,
            update.message.from?.first_name
          );
        } else if (update.callback_query) {
          await handleCallback(
            update.callback_query.message.chat.id,
            update.callback_query.data,
            update.callback_query.id
          );
        }
      } catch (e) {
        console.error('Update handler error', e);
      }
    }

    // Persist messages (best-effort)
    const rows = updates
      .filter((u: any) => u.message)
      .map((u: any) => ({
        update_id: u.update_id,
        chat_id: u.message.chat.id,
        text: u.message.text ?? null,
        raw_update: u,
      }));
    if (rows.length > 0) {
      await supabase.from('telegram_messages').upsert(rows, { onConflict: 'update_id' });
      totalProcessed += rows.length;
    }

    const newOffset = Math.max(...updates.map((u: any) => u.update_id)) + 1;
    await supabase.from('telegram_bot_state')
      .update({ update_offset: newOffset, updated_at: new Date().toISOString() })
      .eq('id', 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
