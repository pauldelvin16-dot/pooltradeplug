
CREATE TABLE public.copy_traders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  handle text NOT NULL UNIQUE,
  avatar_url text,
  bio text,
  strategy text NOT NULL DEFAULT 'Momentum',
  markets text[] NOT NULL DEFAULT ARRAY['BTC/USDT'],
  risk_level text NOT NULL DEFAULT 'medium',
  win_rate numeric NOT NULL DEFAULT 0,
  roi_30d numeric NOT NULL DEFAULT 0,
  roi_all numeric NOT NULL DEFAULT 0,
  max_drawdown numeric NOT NULL DEFAULT 0,
  followers integer NOT NULL DEFAULT 0,
  aum numeric NOT NULL DEFAULT 0,
  min_allocation numeric NOT NULL DEFAULT 50,
  performance_fee numeric NOT NULL DEFAULT 20,
  is_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.copy_traders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copy_traders TO authenticated;
GRANT ALL ON public.copy_traders TO service_role;
ALTER TABLE public.copy_traders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view visible traders" ON public.copy_traders FOR SELECT USING (status <> 'hidden' OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage traders" ON public.copy_traders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_copy_traders_updated BEFORE UPDATE ON public.copy_traders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.copy_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trader_id uuid NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  side text NOT NULL DEFAULT 'long',
  entry_price numeric NOT NULL DEFAULT 0,
  exit_price numeric,
  pnl_pct numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
GRANT SELECT ON public.copy_trades TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.copy_trades TO authenticated;
GRANT ALL ON public.copy_trades TO service_role;
ALTER TABLE public.copy_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view trades" ON public.copy_trades FOR SELECT USING (true);
CREATE POLICY "Admins manage trades" ON public.copy_trades FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.copy_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trader_id uuid NOT NULL REFERENCES public.copy_traders(id) ON DELETE CASCADE,
  allocation numeric NOT NULL,
  pnl numeric NOT NULL DEFAULT 0,
  copy_ratio numeric NOT NULL DEFAULT 100,
  stop_loss_pct numeric,
  take_profit_pct numeric,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  stopped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX copy_sub_active_unique ON public.copy_subscriptions(user_id, trader_id) WHERE status = 'active';
GRANT SELECT, INSERT, UPDATE ON public.copy_subscriptions TO authenticated;
GRANT ALL ON public.copy_subscriptions TO service_role;
ALTER TABLE public.copy_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscriptions" ON public.copy_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update subscriptions" ON public.copy_subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_copy_subs_updated BEFORE UPDATE ON public.copy_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.follow_trader(_trader_id uuid, _amount numeric, _copy_ratio numeric DEFAULT 100, _stop_loss numeric DEFAULT NULL, _take_profit numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); tr record; prof record; new_id uuid;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO tr FROM public.copy_traders WHERE id = _trader_id;
  IF tr.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Trader not found'); END IF;
  IF tr.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'This trader is not accepting copiers'); END IF;
  IF _amount IS NULL OR _amount < tr.min_allocation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Minimum allocation is ' || tr.min_allocation || ' USDT');
  END IF;
  IF EXISTS (SELECT 1 FROM public.copy_subscriptions WHERE user_id = uid AND trader_id = _trader_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You are already copying this trader');
  END IF;
  SELECT * INTO prof FROM public.profiles WHERE user_id = uid FOR UPDATE;
  IF prof.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Profile not found'); END IF;
  IF COALESCE(prof.balance,0) < _amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance', 'balance', COALESCE(prof.balance,0));
  END IF;

  UPDATE public.profiles SET balance = balance - _amount WHERE user_id = uid;
  INSERT INTO public.copy_subscriptions (user_id, trader_id, allocation, copy_ratio, stop_loss_pct, take_profit_pct)
  VALUES (uid, _trader_id, _amount, COALESCE(_copy_ratio,100), _stop_loss, _take_profit)
  RETURNING id INTO new_id;
  UPDATE public.copy_traders SET followers = followers + 1, aum = aum + _amount WHERE id = _trader_id;
  RETURN jsonb_build_object('ok', true, 'subscription_id', new_id);
END $$;

CREATE OR REPLACE FUNCTION public.stop_copy_trading(_subscription_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); sub record; payout numeric;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO sub FROM public.copy_subscriptions WHERE id = _subscription_id FOR UPDATE;
  IF sub.id IS NULL OR sub.user_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Subscription not found'); END IF;
  IF sub.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'Already stopped'); END IF;
  payout := GREATEST(0, sub.allocation + COALESCE(sub.pnl,0));
  UPDATE public.copy_subscriptions SET status = 'stopped', stopped_at = now() WHERE id = sub.id;
  UPDATE public.profiles SET balance = COALESCE(balance,0) + payout WHERE user_id = uid;
  UPDATE public.copy_traders SET followers = GREATEST(0, followers - 1), aum = GREATEST(0, aum - sub.allocation) WHERE id = sub.trader_id;
  RETURN jsonb_build_object('ok', true, 'returned', payout);
END $$;

CREATE OR REPLACE FUNCTION public.adjust_copy_allocation(_subscription_id uuid, _delta numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); sub record; prof record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  IF _delta IS NULL OR _delta = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount'); END IF;
  SELECT * INTO sub FROM public.copy_subscriptions WHERE id = _subscription_id FOR UPDATE;
  IF sub.id IS NULL OR sub.user_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Subscription not found'); END IF;
  IF sub.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'Subscription is not active'); END IF;
  SELECT * INTO prof FROM public.profiles WHERE user_id = uid FOR UPDATE;
  IF _delta > 0 THEN
    IF COALESCE(prof.balance,0) < _delta THEN RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance'); END IF;
    UPDATE public.profiles SET balance = balance - _delta WHERE user_id = uid;
    UPDATE public.copy_subscriptions SET allocation = allocation + _delta WHERE id = sub.id;
    UPDATE public.copy_traders SET aum = aum + _delta WHERE id = sub.trader_id;
  ELSE
    IF sub.allocation + _delta < 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Amount exceeds allocation'); END IF;
    UPDATE public.profiles SET balance = COALESCE(balance,0) + (-_delta) WHERE user_id = uid;
    UPDATE public.copy_subscriptions SET allocation = allocation + _delta WHERE id = sub.id;
    UPDATE public.copy_traders SET aum = GREATEST(0, aum + _delta) WHERE id = sub.trader_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
