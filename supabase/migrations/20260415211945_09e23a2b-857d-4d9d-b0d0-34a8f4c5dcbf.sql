
-- Add first deposit bonus config to admin_settings
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS first_deposit_bonus_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_deposit_min_amount numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS first_deposit_bonus_amount numeric NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS telegram_bot_link text DEFAULT NULL;

-- Add first_deposit_claimed to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_deposit_claimed boolean NOT NULL DEFAULT false;
