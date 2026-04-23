-- SMTP settings (single-row config)
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS smtp_host text,
  ADD COLUMN IF NOT EXISTS smtp_port integer DEFAULT 587,
  ADD COLUMN IF NOT EXISTS smtp_secure boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS smtp_username text,
  ADD COLUMN IF NOT EXISTS smtp_password text,
  ADD COLUMN IF NOT EXISTS smtp_from_email text,
  ADD COLUMN IF NOT EXISTS smtp_from_name text DEFAULT 'TradeLux',
  ADD COLUMN IF NOT EXISTS smtp_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS otp_login_enabled boolean DEFAULT false;

-- OTP codes table for optional 2FA login
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON public.otp_codes (email, created_at DESC);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role accesses otp_codes (no client policies = denied to anon/auth users)
-- Edge functions using service role bypass RLS.

-- Email log for audit
CREATE TABLE IF NOT EXISTS public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  template text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view email log" ON public.email_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));