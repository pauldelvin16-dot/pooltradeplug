
-- 1. Realtime publication for pools, participants, deposits
ALTER TABLE public.pools REPLICA IDENTITY FULL;
ALTER TABLE public.pool_participants REPLICA IDENTITY FULL;
ALTER TABLE public.deposits REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='pools') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pools;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='pool_participants') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pool_participants;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='deposits') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
  END IF;
END $$;

-- 2. Add payout_status to pool_participants
ALTER TABLE public.pool_participants
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'locked';

-- 3. Auto-expire deposits whose window passed
CREATE OR REPLACE FUNCTION public.expire_old_deposits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.deposits
     SET status = 'expired'
   WHERE status = 'pending'
     AND expires_at IS NOT NULL
     AND expires_at < now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

-- 4. Request payout for a completed pool participation
CREATE OR REPLACE FUNCTION public.request_pool_payout(_pool_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p record;
  part record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  SELECT * INTO p FROM public.pools WHERE id = _pool_id;
  IF p.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Pool not found'); END IF;
  IF p.status NOT IN ('completed','failed','cancelled') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payouts are locked while this pool is ' || p.status);
  END IF;
  SELECT * INTO part FROM public.pool_participants WHERE pool_id = _pool_id AND user_id = uid FOR UPDATE;
  IF part.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'You are not in this pool'); END IF;
  IF part.payout_status = 'paid' THEN RETURN jsonb_build_object('ok', false, 'error', 'Already paid out'); END IF;
  IF part.payout_status = 'in_progress' THEN RETURN jsonb_build_object('ok', false, 'error', 'Payout already requested'); END IF;
  UPDATE public.pool_participants SET payout_status = 'in_progress' WHERE id = part.id;
  RETURN jsonb_build_object('ok', true);
END $$;
