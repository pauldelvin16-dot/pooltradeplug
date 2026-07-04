
-- Leave pool before it starts (refund entry)
CREATE OR REPLACE FUNCTION public.leave_pool(_pool_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  p record;
  part record;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO p FROM public.pools WHERE id = _pool_id FOR UPDATE;
  IF p.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pool not found');
  END IF;

  IF p.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You can only leave an active pool');
  END IF;

  IF p.start_date IS NOT NULL AND p.start_date <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pool has already started — you can no longer leave');
  END IF;

  SELECT * INTO part FROM public.pool_participants
   WHERE pool_id = _pool_id AND user_id = uid FOR UPDATE;
  IF part.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You are not in this pool');
  END IF;

  IF part.payout_status IN ('paid','in_progress') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payout already in progress');
  END IF;

  -- Refund entry
  UPDATE public.profiles
     SET balance = COALESCE(balance, 0) + COALESCE(part.amount_invested, p.entry_amount)
   WHERE user_id = uid;

  DELETE FROM public.pool_participants WHERE id = part.id;

  UPDATE public.pools
     SET current_participants = GREATEST(0, current_participants - 1),
         updated_at = now()
   WHERE id = _pool_id;

  RETURN jsonb_build_object('ok', true, 'refunded', COALESCE(part.amount_invested, p.entry_amount));
END $$;

-- Require current balance to still be >= min deposit at claim time
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  total_confirmed numeric;
  existing record;
  prof record;
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

  -- NEW: require the user to still hold the minimum in their current balance
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
