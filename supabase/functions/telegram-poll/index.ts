import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';
const MAX_RUNTIME_MS = 55_000;
const MIN_REMAINING_MS = 5_000;

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async () => {
  const startTime = Date.now();

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), { status: 500 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: settings } = await supabase.from('admin_settings').select('telegram_bot_token, telegram_admin_chat_id').limit(1).single();
  const TELEGRAM_API_KEY = settings?.telegram_bot_token;
  if (!TELEGRAM_API_KEY) return new Response(JSON.stringify({ error: 'Telegram bot token not configured in admin settings' }), { status: 200 });

  let totalProcessed = 0;

  const { data: state, error: stateErr } = await supabase.from('telegram_bot_state').select('update_offset').eq('id', 1).single();
  if (stateErr) return new Response(JSON.stringify({ error: stateErr.message }), { status: 500 });

  let currentOffset = state.update_offset;

  const sendTelegramMessage = async (chatId: number | string, text: string, replyMarkup?: any) => {
    const body: any = { chat_id: chatId, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  };

  const handleCommand = async (chatId: number, text: string) => {
    const cmd = text.trim().toLowerCase().split(' ')[0];
    const args = text.trim().split(' ').slice(1);

    const { data: profile } = await supabase.from('profiles').select('*').eq('telegram_chat_id', String(chatId)).single();

    const keyboard = {
      keyboard: [
        [{ text: '💰 Balance' }, { text: '📥 Deposit' }],
        [{ text: '🏊 Pools' }, { text: '🔑 Reset Password' }],
        [{ text: '❓ Help' }],
      ],
      resize_keyboard: true,
    };

    if (cmd === '/start') {
      await sendTelegramMessage(chatId,
        `🏆 <b>Welcome to TradeLux!</b>\n\n` +
        `Your elite trading companion.\n\n` +
        `📌 <b>Get started:</b>\nLink your account with:\n<code>/link your@email.com</code>\n\n` +
        `Then use the buttons below to check your balance, deposit, and more!`,
        keyboard
      );
    } else if (cmd === '/link') {
      const email = args[0];
      if (!email) {
        await sendTelegramMessage(chatId, '❌ Please provide your email:\n<code>/link your@email.com</code>');
        return;
      }
      const { data: targetProfile } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).single();
      if (!targetProfile) {
        await sendTelegramMessage(chatId, '❌ No account found with that email. Please sign up first at TradeLux.');
        return;
      }
      const { error: linkErr } = await supabase.from('profiles')
        .update({ telegram_chat_id: String(chatId), telegram_linked: true })
        .eq('user_id', targetProfile.user_id);
      if (linkErr) {
        await sendTelegramMessage(chatId, '❌ Failed to link account. Please try again.');
        return;
      }
      await sendTelegramMessage(chatId,
        `✅ <b>Account linked!</b>\n\n` +
        `Welcome, <b>${targetProfile.first_name || 'Trader'}</b>!\n` +
        `Your TradeLux account is now connected. Use the buttons below to get started.`,
        keyboard
      );
    } else if (cmd === '/balance' || text === '💰 Balance') {
      if (!profile) {
        await sendTelegramMessage(chatId, '❌ Account not linked. Use <code>/link your@email.com</code> first.');
        return;
      }
      await sendTelegramMessage(chatId,
        `💰 <b>Your Balance</b>\n\n` +
        `<b>$${parseFloat(profile.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>\n\n` +
        `👤 ${profile.first_name} ${profile.last_name}\n📧 ${profile.email}`
      );
    } else if (cmd === '/deposit' || text === '📥 Deposit') {
      if (!profile) {
        await sendTelegramMessage(chatId, '❌ Account not linked. Use <code>/link your@email.com</code> first.');
        return;
      }
      const { data: addresses } = await supabase.from('crypto_addresses').select('*').eq('is_active', true);
      if (!addresses || addresses.length === 0) {
        await sendTelegramMessage(chatId, '⚠️ No deposit addresses available. Please contact admin.');
        return;
      }
      let msg = '📥 <b>Deposit Addresses</b>\n\n';
      for (const addr of addresses) {
        msg += `<b>${addr.currency} (${addr.network})</b>${addr.label ? ` — ${addr.label}` : ''}\n`;
        msg += `<code>${addr.address}</code>\n\n`;
      }
      msg += '⚠️ Always verify the network before sending. Deposits are credited after admin confirmation.';
      await sendTelegramMessage(chatId, msg);
    } else if (cmd === '/pools' || text === '🏊 Pools') {
      const { data: pools } = await supabase.from('pools').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(5);
      if (!pools || pools.length === 0) {
        await sendTelegramMessage(chatId, '🏊 No active pools right now. Check back later!');
        return;
      }
      let msg = '🏊 <b>Active Trading Pools</b>\n\n';
      for (const pool of pools) {
        const symbol = pool.traded_symbol ? ` 📊 ${pool.traded_symbol}` : '';
        const split = pool.profit_split_percentage || 70;
        msg += `<b>${pool.name}</b>${symbol}\n`;
        msg += `💵 Entry: $${parseFloat(pool.entry_amount as any).toLocaleString()}\n`;
        msg += `👥 ${pool.current_participants}/${pool.max_participants} participants\n`;
        msg += `📈 Profit: $${parseFloat(pool.current_profit as any).toLocaleString()} / $${parseFloat(pool.target_profit as any).toLocaleString()}\n`;
        msg += `💰 ${split}% profit split to you\n\n`;
      }
      msg += '💡 Log in to TradeLux to join a pool!';
      await sendTelegramMessage(chatId, msg);
    } else if (cmd === '/resetpassword' || text === '🔑 Reset Password') {
      if (!profile) {
        await sendTelegramMessage(chatId, '❌ Account not linked. Use <code>/link your@email.com</code> first to reset your password.');
        return;
      }
      // Generate temp password and update via admin API
      const tempPassword = generateTempPassword();
      const { data: userData } = await supabase.auth.admin.listUsers();
      const authUser = userData?.users?.find((u: any) => u.email === profile.email);
      if (!authUser) {
        await sendTelegramMessage(chatId, '❌ Could not find your auth account. Please contact support.');
        return;
      }
      const { error: resetErr } = await supabase.auth.admin.updateUserById(authUser.id, { password: tempPassword });
      if (resetErr) {
        await sendTelegramMessage(chatId, '❌ Failed to reset password. Please try again later.');
        return;
      }
      await sendTelegramMessage(chatId,
        `🔑 <b>Password Reset</b>\n\n` +
        `Your temporary password:\n<code>${tempPassword}</code>\n\n` +
        `⚠️ <b>Important:</b> Please log in and change this password immediately in your Profile settings.\n\n` +
        `This password is temporary and should not be shared with anyone.`
      );
    } else if (cmd === '/help' || text === '❓ Help') {
      await sendTelegramMessage(chatId,
        `❓ <b>TradeLux Bot Commands</b>\n\n` +
        `/start — Welcome\n` +
        `/link &lt;email&gt; — Link your account\n` +
        `/balance — Check balance\n` +
        `/deposit — Get deposit addresses\n` +
        `/pools — View active pools\n` +
        `/resetpassword — Get temporary password\n` +
        `/help — Show this help\n\n` +
        `Or use the keyboard buttons below! 👇`,
        keyboard
      );
    } else {
      await sendTelegramMessage(chatId, '🤔 Unknown command. Use /help to see available commands.', keyboard);
    }
  };

  // Poll loop
  while (true) {
    const elapsed = Date.now() - startTime;
    const remainingMs = MAX_RUNTIME_MS - elapsed;
    if (remainingMs < MIN_REMAINING_MS) break;

    const timeout = Math.min(50, Math.floor(remainingMs / 1000) - 5);
    if (timeout < 1) break;

    const response = await fetch(`${GATEWAY_URL}/getUpdates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TELEGRAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ offset: currentOffset, timeout, allowed_updates: ['message'] }),
    });

    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({ error: data }), { status: 502 });

    const updates = data.result ?? [];
    if (updates.length === 0) continue;

    for (const update of updates) {
      if (update.message?.text) {
        try {
          await handleCommand(update.message.chat.id, update.message.text);
        } catch (e) {
          console.error('Error handling command:', e);
        }
      }
    }

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
    await supabase.from('telegram_bot_state').update({ update_offset: newOffset, updated_at: new Date().toISOString() }).eq('id', 1);
    currentOffset = newOffset;
  }

  return new Response(JSON.stringify({ ok: true, processed: totalProcessed, finalOffset: currentOffset }));
});
