CREATE TABLE IF NOT EXISTS public.email_optouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text DEFAULT 'one_click',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.email_optouts TO service_role;
ALTER TABLE public.email_optouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_view_optouts" ON public.email_optouts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS wallet_connect_enabled boolean DEFAULT true;