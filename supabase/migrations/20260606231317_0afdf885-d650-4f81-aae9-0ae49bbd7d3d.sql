CREATE OR REPLACE FUNCTION public.join_pool(_pool_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  p record;
  prof record;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO p
  FROM public.pools
  WHERE id = _pool_id
  FOR UPDATE;

  IF p.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pool not found');
  END IF;

  IF p.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pool is not active');
  END IF;

  IF p.current_participants >= p.max_participants THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pool is full');
  END IF;

  IF EXISTS (SELECT 1 FROM public.pool_participants WHERE pool_id = _pool_id AND user_id = uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You have already joined this pool');
  END IF;

  SELECT * INTO prof
  FROM public.profiles
  WHERE user_id = uid
  FOR UPDATE;

  IF prof.user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Profile not found');
  END IF;

  IF COALESCE(prof.balance, 0) < p.entry_amount THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance', 'needed', p.entry_amount, 'balance', COALESCE(prof.balance, 0));
  END IF;

  UPDATE public.profiles
  SET balance = COALESCE(balance, 0) - p.entry_amount
  WHERE user_id = uid;

  INSERT INTO public.pool_participants (pool_id, user_id, amount_invested)
  VALUES (_pool_id, uid, p.entry_amount);

  UPDATE public.pools
  SET current_participants = current_participants + 1,
      updated_at = now()
  WHERE id = _pool_id;

  RETURN jsonb_build_object('ok', true, 'amount', p.entry_amount);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You have already joined this pool');
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_pool(uuid) TO authenticated;