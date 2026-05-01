CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  address text NOT NULL,
  chain_id integer NOT NULL,
  wallet_type text,
  is_primary boolean NOT NULL DEFAULT false,
  last_seen_balance_usd numeric DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, address, chain_id)
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own wallets" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallets" ON public.user_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own wallets" ON public.user_wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own wallets" ON public.user_wallets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all wallets" ON public.user_wallets FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update all wallets" ON public.user_wallets FOR UPDATE USING (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.user_wallet_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  chain_id integer NOT NULL,
  token_address text,
  symbol text NOT NULL,
  decimals integer NOT NULL DEFAULT 18,
  balance numeric NOT NULL DEFAULT 0,
  balance_usd numeric NOT NULL DEFAULT 0,
  is_native boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_wallet_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners view assets" ON public.user_wallet_assets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid()));
CREATE POLICY "Admins view all assets" ON public.user_wallet_assets FOR SELECT USING (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.pool_chain_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id integer NOT NULL UNIQUE,
  chain_name text NOT NULL,
  pool_address text NOT NULL,
  encrypted_pk bytea NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pool_chain_keys ENABLE ROW LEVEL SECURITY;
-- No direct client access; only service role.

CREATE OR REPLACE VIEW public.pool_chain_keys_safe AS
  SELECT id, chain_id, chain_name, pool_address, is_active, notes, created_at, updated_at
  FROM public.pool_chain_keys;
GRANT SELECT ON public.pool_chain_keys_safe TO authenticated;

CREATE TABLE IF NOT EXISTS public.sweep_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid,
  user_id uuid NOT NULL,
  wallet_id uuid NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  chain_id integer NOT NULL,
  token_address text,
  symbol text NOT NULL,
  amount numeric NOT NULL,
  amount_usd numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  approve_tx text,
  sweep_tx text,
  triggered_by uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sweep_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sweeps" ON public.sweep_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own sweeps" ON public.sweep_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins select sweeps" ON public.sweep_requests FOR SELECT USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert sweeps" ON public.sweep_requests FOR INSERT WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update sweeps" ON public.sweep_requests FOR UPDATE USING (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.gas_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  chain_id integer NOT NULL,
  amount_native numeric NOT NULL,
  tx_hash text,
  reason text,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gas_drops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own gas drops" ON public.gas_drops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all gas drops" ON public.gas_drops FOR SELECT USING (has_role(auth.uid(),'admin'));

ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS alchemy_api_key text,
  ADD COLUMN IF NOT EXISTS web3_project_id text,
  ADD COLUMN IF NOT EXISTS web3_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gas_station_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gas_min_usd_to_sweep numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS gas_drop_amount_usd numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pk_encryption_key text;

CREATE TRIGGER trg_user_wallets_updated BEFORE UPDATE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pool_chain_keys_updated BEFORE UPDATE ON public.pool_chain_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_sweep_requests_updated BEFORE UPDATE ON public.sweep_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();