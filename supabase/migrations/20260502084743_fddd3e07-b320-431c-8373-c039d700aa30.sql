ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS auto_sweep_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_sweep_min_usd numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS auto_sweep_interval_minutes integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_gas_topup_enabled boolean NOT NULL DEFAULT true;