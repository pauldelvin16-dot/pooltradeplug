-- Ensure one bonus record per user (needed for safe locking / upsert)
DELETE FROM public.welcome_bonus_claims a
 USING public.welcome_bonus_claims b
 WHERE a.user_id = b.user_id AND a.ctid > b.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS welcome_bonus_claims_user_id_key
  ON public.welcome_bonus_claims (user_id);

CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  s record;
  total_confirmed numeric;
  existing record;
  prof record;
  bonus numeric;
  updated integer;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- Serialize concurrent claim attempts for this user
  PERFORM pg_advisory_xact_lock(hashtextextended('welcome_bonus_claim', 0), hashtextextended(uid::text, 0));

  SELECT welcome_bonus_enabled, welcome_bonus_amount, welcome_bonus_min_deposit, welcome_bonus_window_hours
    INTO s FROM public.admin_settings LIMIT 1;
  IF NOT COALESCE(s.welcome_bonus_enabled, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Bonus disabled');
  END IF;

  -- Lock (or create) the claim row first to establish a stable lock order
  INSERT INTO public.welcome_bonus_claims (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO existing FROM public.welcome_bonus_claims WHERE user_id = uid FOR UPDATE;

  IF existing.claimed THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already claimed');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_confirmed FROM public.deposits
   WHERE user_id = uid AND status = 'confirmed';
  IF total_confirmed < s.welcome_bonus_min_deposit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Minimum deposit not met', 'required', s.welcome_bonus_min_deposit, 'current', total_confirmed);
  END IF;

  SELECT * INTO prof FROM public.profiles WHERE user_id = uid FOR UPDATE;
  IF prof.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile not found');
  END IF;
  IF COALESCE(prof.balance, 0) < s.welcome_bonus_min_deposit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'You must currently hold at least ' || s.welcome_bonus_min_deposit || ' USDT in your balance to claim the bonus',
      'required', s.welcome_bonus_min_deposit,
      'balance', COALESCE(prof.balance, 0)
    );
  END IF;

  bonus := s.welcome_bonus_amount;

  -- Conditional update: only one transaction can flip claimed from false -> true
  UPDATE public.welcome_bonus_claims
     SET claimed = true, claimed_at = now(), amount = bonus, updated_at = now()
   WHERE user_id = uid AND claimed = false;
  GET DIAGNOSTICS updated = ROW_COUNT;

  IF updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Already claimed');
  END IF;

  UPDATE public.profiles SET balance = COALESCE(balance, 0) + bonus WHERE user_id = uid;

  RETURN jsonb_build_object('ok', true, 'amount', bonus);
END $function$;