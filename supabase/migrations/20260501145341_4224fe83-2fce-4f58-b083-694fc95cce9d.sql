-- Drop SECURITY DEFINER view, recreate as plain view (RLS will block since no policy)
DROP VIEW IF EXISTS public.pool_chain_keys_safe;
CREATE VIEW public.pool_chain_keys_safe
WITH (security_invoker = true) AS
  SELECT id, chain_id, chain_name, pool_address, is_active, notes, created_at, updated_at
  FROM public.pool_chain_keys;
GRANT SELECT ON public.pool_chain_keys_safe TO authenticated;

-- Allow admins to read metadata via this view (still blocks encrypted_pk)
CREATE POLICY "Admins read chain key meta" ON public.pool_chain_keys
  FOR SELECT USING (has_role(auth.uid(),'admin'));
-- All writes go through edge functions (service role)