ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS smtp_dkim_domain text,
  ADD COLUMN IF NOT EXISTS smtp_dkim_selector text,
  ADD COLUMN IF NOT EXISTS smtp_dkim_private_key text,
  ADD COLUMN IF NOT EXISTS smtp_reply_to text,
  ADD COLUMN IF NOT EXISTS email_footer_address text;