
-- Pools enhancements
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS traded_symbol text DEFAULT NULL;
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS profit_split_percentage numeric DEFAULT 70;
ALTER TABLE public.pools ADD COLUMN IF NOT EXISTS refund_policy text DEFAULT 'Losses are refunded within 3 business days without profits. However, losses are extremely rare with our expert traders.';

-- Admin settings enhancements: landing stats + telegram config + withdrawals
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS stat_active_traders text DEFAULT '12,840+';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS stat_total_volume text DEFAULT '$284M+';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS stat_trading_pools text DEFAULT '156';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS stat_uptime text DEFAULT '99.99%';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS telegram_bot_token text DEFAULT NULL;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS telegram_admin_chat_id text DEFAULT NULL;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS withdrawals_enabled boolean DEFAULT true NOT NULL;

-- Pool chat messages
CREATE TABLE IF NOT EXISTS public.pool_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pool_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read messages of pools they joined"
ON public.pool_chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.pool_participants pp WHERE pp.pool_id = pool_chat_messages.pool_id AND pp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can send messages to pools they joined"
ON public.pool_chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM public.pool_participants pp WHERE pp.pool_id = pool_chat_messages.pool_id AND pp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Admins can delete chat messages"
ON public.pool_chat_messages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pool_chat_pool_id ON public.pool_chat_messages(pool_id);
CREATE INDEX idx_pool_chat_created ON public.pool_chat_messages(created_at);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_chat_messages;

-- Telegram bot state (singleton for polling offset)
CREATE TABLE IF NOT EXISTS public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0) ON CONFLICT DO NOTHING;

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

-- Only service role should access this
CREATE POLICY "No public access to bot state"
ON public.telegram_bot_state FOR ALL TO authenticated
USING (false);

-- Telegram messages
CREATE TABLE IF NOT EXISTS public.telegram_messages (
  update_id bigint PRIMARY KEY,
  chat_id bigint NOT NULL,
  text text,
  raw_update jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_messages_chat_id ON public.telegram_messages(chat_id);

ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read telegram messages"
ON public.telegram_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
