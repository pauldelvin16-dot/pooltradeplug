
-- Settings columns
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS virtual_card_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS virtual_card_fee numeric NOT NULL DEFAULT 20;

-- Virtual cards table
CREATE TABLE IF NOT EXISTS public.virtual_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cardholder_name text NOT NULL,
  brand text NOT NULL DEFAULT 'VISA',
  last4 text NOT NULL DEFAULT '0000',
  bin text NOT NULL DEFAULT '400000',
  encrypted_number bytea,
  encrypted_cvv bytea,
  expiry_month int NOT NULL DEFAULT 12,
  expiry_year int NOT NULL DEFAULT (EXTRACT(YEAR FROM now())::int + 4),
  balance numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  design text NOT NULL DEFAULT 'aurora',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.virtual_cards TO authenticated;
GRANT ALL ON public.virtual_cards TO service_role;

ALTER TABLE public.virtual_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cards"
  ON public.virtual_cards FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update cards"
  ON public.virtual_cards FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete cards"
  ON public.virtual_cards FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_virtual_cards_updated_at
  BEFORE UPDATE ON public.virtual_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Card transactions
CREATE TABLE IF NOT EXISTS public.card_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.virtual_cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_transactions TO authenticated;
GRANT ALL ON public.card_transactions TO service_role;

ALTER TABLE public.card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own card txns"
  ON public.card_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Purchase a virtual card (charges fee, returns card_id; edge fn fills secrets)
CREATE OR REPLACE FUNCTION public.purchase_virtual_card(_design text DEFAULT 'aurora')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  s record;
  prof record;
  new_id uuid;
  full_name text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  SELECT virtual_card_enabled, virtual_card_fee INTO s FROM public.admin_settings LIMIT 1;
  IF NOT COALESCE(s.virtual_card_enabled, true) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Virtual cards disabled');
  END IF;
  SELECT * INTO prof FROM public.profiles WHERE user_id = uid FOR UPDATE;
  IF prof.user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Profile not found'); END IF;
  IF COALESCE(prof.balance, 0) < s.virtual_card_fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance', 'required', s.virtual_card_fee);
  END IF;

  full_name := trim(COALESCE(prof.first_name,'') || ' ' || COALESCE(prof.last_name,''));
  IF length(full_name) < 2 THEN full_name := COALESCE(prof.email, 'CARD HOLDER'); END IF;

  UPDATE public.profiles SET balance = balance - s.virtual_card_fee WHERE user_id = uid;

  INSERT INTO public.virtual_cards (user_id, cardholder_name, design)
  VALUES (uid, upper(full_name), COALESCE(_design,'aurora'))
  RETURNING id INTO new_id;

  INSERT INTO public.card_transactions (card_id, user_id, type, amount, description)
  VALUES (new_id, uid, 'purchase_fee', s.virtual_card_fee, 'Virtual card issuance fee');

  RETURN jsonb_build_object('ok', true, 'card_id', new_id, 'fee', s.virtual_card_fee);
END $$;

-- Load funds onto card from main balance
CREATE OR REPLACE FUNCTION public.load_virtual_card(_card_id uuid, _amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c record; prof record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount'); END IF;
  SELECT * INTO c FROM public.virtual_cards WHERE id = _card_id FOR UPDATE;
  IF c.id IS NULL OR c.user_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Card not found'); END IF;
  IF c.status <> 'active' THEN RETURN jsonb_build_object('ok', false, 'error', 'Card is ' || c.status); END IF;
  SELECT * INTO prof FROM public.profiles WHERE user_id = uid FOR UPDATE;
  IF COALESCE(prof.balance,0) < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'Insufficient balance'); END IF;

  UPDATE public.profiles SET balance = balance - _amount WHERE user_id = uid;
  UPDATE public.virtual_cards SET balance = balance + _amount WHERE id = _card_id;
  INSERT INTO public.card_transactions (card_id, user_id, type, amount, description)
  VALUES (_card_id, uid, 'load', _amount, 'Loaded from main balance');
  RETURN jsonb_build_object('ok', true);
END $$;

-- Withdraw from card back to main balance
CREATE OR REPLACE FUNCTION public.unload_virtual_card(_card_id uuid, _amount numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c record;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Invalid amount'); END IF;
  SELECT * INTO c FROM public.virtual_cards WHERE id = _card_id FOR UPDATE;
  IF c.id IS NULL OR c.user_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Card not found'); END IF;
  IF c.balance < _amount THEN RETURN jsonb_build_object('ok', false, 'error', 'Card balance too low'); END IF;
  UPDATE public.virtual_cards SET balance = balance - _amount WHERE id = _card_id;
  UPDATE public.profiles SET balance = COALESCE(balance,0) + _amount WHERE user_id = uid;
  INSERT INTO public.card_transactions (card_id, user_id, type, amount, description)
  VALUES (_card_id, uid, 'unload', _amount, 'Returned to main balance');
  RETURN jsonb_build_object('ok', true);
END $$;

-- Block / unblock by owner; suspend by admin
CREATE OR REPLACE FUNCTION public.set_card_status(_card_id uuid, _status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c record; is_admin boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated'); END IF;
  is_admin := public.has_role(uid, 'admin');
  SELECT * INTO c FROM public.virtual_cards WHERE id = _card_id FOR UPDATE;
  IF c.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Card not found'); END IF;
  IF NOT is_admin AND c.user_id <> uid THEN RETURN jsonb_build_object('ok', false, 'error', 'Forbidden'); END IF;
  IF _status NOT IN ('active','blocked','suspended','expired') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid status');
  END IF;
  IF _status = 'suspended' AND NOT is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only admins can suspend');
  END IF;
  IF c.status = 'suspended' AND NOT is_admin THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Card is suspended by admin');
  END IF;
  UPDATE public.virtual_cards SET status = _status WHERE id = _card_id;
  RETURN jsonb_build_object('ok', true, 'status', _status);
END $$;

-- Read full card secrets (only owner if not suspended, or admin)
CREATE OR REPLACE FUNCTION public.read_card_secrets(_card_id uuid, _master text)
RETURNS TABLE(card_number text, cvv text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE uid uuid := auth.uid(); c record; is_admin boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  is_admin := public.has_role(uid, 'admin');
  SELECT * INTO c FROM public.virtual_cards WHERE id = _card_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Card not found'; END IF;
  IF NOT is_admin AND c.user_id <> uid THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF c.status = 'suspended' AND NOT is_admin THEN RAISE EXCEPTION 'Card suspended'; END IF;
  IF c.encrypted_number IS NULL THEN RAISE EXCEPTION 'Card not provisioned yet'; END IF;
  RETURN QUERY SELECT
    extensions.pgp_sym_decrypt(c.encrypted_number, _master)::text,
    extensions.pgp_sym_decrypt(c.encrypted_cvv, _master)::text;
END $$;
