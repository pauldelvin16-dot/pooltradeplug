
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'trader', 'user');
CREATE TYPE public.deposit_status AS ENUM ('pending', 'confirmed', 'rejected', 'expired');
CREATE TYPE public.mt5_status AS ENUM ('available', 'active', 'disabled', 'pending_review');
CREATE TYPE public.pool_status AS ENUM ('active', 'completed', 'failed', 'cancelled');
CREATE TYPE public.booking_status AS ENUM ('pending', 'paid', 'approved', 'rejected');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected', 'processing', 'completed');

-- Create user_roles FIRST so has_role can reference it
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  telegram_chat_id TEXT,
  telegram_linked BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposits_enabled BOOLEAN NOT NULL DEFAULT true,
  mt5_enabled BOOLEAN NOT NULL DEFAULT true,
  pools_enabled BOOLEAN NOT NULL DEFAULT true,
  registrations_enabled BOOLEAN NOT NULL DEFAULT true,
  deposit_countdown_minutes INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.admin_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert settings" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.admin_settings (id) VALUES (gen_random_uuid());

CREATE TABLE public.crypto_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'TRC20',
  currency TEXT NOT NULL DEFAULT 'USDT',
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crypto_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read addresses" ON public.crypto_addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert addresses" ON public.crypto_addresses FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update addresses" ON public.crypto_addresses FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete addresses" ON public.crypto_addresses FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_crypto_addresses_updated_at BEFORE UPDATE ON public.crypto_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  crypto_address_id UUID REFERENCES public.crypto_addresses(id),
  txid TEXT,
  proof_url TEXT,
  status deposit_status NOT NULL DEFAULT 'pending',
  network TEXT NOT NULL DEFAULT 'TRC20',
  currency TEXT NOT NULL DEFAULT 'USDT',
  expires_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pending deposits" ON public.deposits FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins can view all deposits" ON public.deposits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update deposits" ON public.deposits FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON public.deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'TRC20',
  currency TEXT NOT NULL DEFAULT 'USDT',
  status withdrawal_status NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all withdrawals" ON public.withdrawals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update withdrawals" ON public.withdrawals FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mt5_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mt5_login TEXT NOT NULL,
  mt5_server TEXT,
  status mt5_status NOT NULL DEFAULT 'pending_review',
  max_allocation NUMERIC(15,2) DEFAULT 0,
  current_usage NUMERIC(15,2) DEFAULT 0,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mt5_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mt5" ON public.mt5_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own mt5" ON public.mt5_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all mt5" ON public.mt5_accounts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update mt5" ON public.mt5_accounts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_mt5_accounts_updated_at BEFORE UPDATE ON public.mt5_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.mt5_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mt5_account_id UUID NOT NULL REFERENCES public.mt5_accounts(id) ON DELETE CASCADE,
  booking_fee NUMERIC(15,2) NOT NULL DEFAULT 50,
  status booking_status NOT NULL DEFAULT 'pending',
  deposit_id UUID REFERENCES public.deposits(id),
  scheduled_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mt5_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own bookings" ON public.mt5_bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own bookings" ON public.mt5_bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all bookings" ON public.mt5_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bookings" ON public.mt5_bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_mt5_bookings_updated_at BEFORE UPDATE ON public.mt5_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  target_profit NUMERIC(15,2) NOT NULL,
  current_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_participants INTEGER NOT NULL DEFAULT 10,
  current_participants INTEGER NOT NULL DEFAULT 0,
  entry_amount NUMERIC(15,2) NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  status pool_status NOT NULL DEFAULT 'active',
  fallback_action TEXT DEFAULT 'refund',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view pools" ON public.pools FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert pools" ON public.pools FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pools" ON public.pools FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pools" ON public.pools FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON public.pools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pool_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES public.pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_invested NUMERIC(15,2) NOT NULL,
  profit_share NUMERIC(15,2) DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pool_id, user_id)
);
ALTER TABLE public.pool_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own participations" ON public.pool_participants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can join pools" ON public.pool_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all participations" ON public.pool_participants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update participations" ON public.pool_participants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete participations" ON public.pool_participants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX idx_deposits_status ON public.deposits(status);
CREATE INDEX idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX idx_mt5_accounts_user_id ON public.mt5_accounts(user_id);
CREATE INDEX idx_pool_participants_pool_id ON public.pool_participants(pool_id);
CREATE INDEX idx_pool_participants_user_id ON public.pool_participants(user_id);
