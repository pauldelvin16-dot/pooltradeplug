
-- Admin-controlled site logo / favicon
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS site_logo_url text;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS site_favicon_url text;

-- Welcome bonus configuration
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS welcome_bonus_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS welcome_bonus_amount numeric NOT NULL DEFAULT 25;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS welcome_bonus_min_deposit numeric NOT NULL DEFAULT 100;
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS welcome_bonus_window_hours integer NOT NULL DEFAULT 24;

-- Per-user welcome bonus claim tracking (looping countdown)
CREATE TABLE IF NOT EXISTS public.welcome_bonus_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  amount numeric NOT NULL DEFAULT 0,
  cycle_started_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.welcome_bonus_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bonus" ON public.welcome_bonus_claims
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own bonus" ON public.welcome_bonus_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own bonus" ON public.welcome_bonus_claims
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all bonus" ON public.welcome_bonus_claims
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update all bonus" ON public.welcome_bonus_claims
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Atomic claim function — checks eligibility, credits balance, marks claimed
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  total_confirmed numeric;
  existing record;
  bonus numeric;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT welcome_bonus_enabled, welcome_bonus_amount, welcome_bonus_min_deposit, welcome_bonus_window_hours
    INTO s FROM public.admin_settings LIMIT 1;
  IF NOT COALESCE(s.welcome_bonus_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bonus disabled');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_confirmed FROM public.deposits
   WHERE user_id = uid AND status = 'confirmed';
  IF total_confirmed < s.welcome_bonus_min_deposit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Minimum deposit not met', 'required', s.welcome_bonus_min_deposit, 'current', total_confirmed);
  END IF;

  SELECT * INTO existing FROM public.welcome_bonus_claims WHERE user_id = uid;
  IF existing.claimed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already claimed');
  END IF;

  bonus := s.welcome_bonus_amount;
  UPDATE public.profiles SET balance = COALESCE(balance, 0) + bonus WHERE user_id = uid;

  IF existing.id IS NULL THEN
    INSERT INTO public.welcome_bonus_claims (user_id, claimed, claimed_at, amount)
    VALUES (uid, true, now(), bonus);
  ELSE
    UPDATE public.welcome_bonus_claims
       SET claimed = true, claimed_at = now(), amount = bonus, updated_at = now()
     WHERE user_id = uid;
  END IF;

  RETURN jsonb_build_object('ok', true, 'amount', bonus);
END $$;

-- Reset cycle if window expired (for the looping countdown)
CREATE OR REPLACE FUNCTION public.reset_welcome_bonus_cycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  rec record;
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  SELECT welcome_bonus_window_hours INTO s FROM public.admin_settings LIMIT 1;
  SELECT * INTO rec FROM public.welcome_bonus_claims WHERE user_id = uid;
  IF rec.id IS NULL THEN
    INSERT INTO public.welcome_bonus_claims (user_id) VALUES (uid);
    RETURN;
  END IF;
  IF NOT rec.claimed AND rec.cycle_started_at + (s.welcome_bonus_window_hours || ' hours')::interval < now() THEN
    UPDATE public.welcome_bonus_claims
       SET cycle_started_at = now(), updated_at = now()
     WHERE user_id = uid;
  END IF;
END $$;
