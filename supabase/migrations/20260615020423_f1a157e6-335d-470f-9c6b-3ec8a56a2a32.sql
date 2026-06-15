
CREATE OR REPLACE FUNCTION public.provision_virtual_card(
  _card_id uuid,
  _full_number text,
  _cvv text,
  _last4 text,
  _bin text,
  _brand text,
  _exp_month int,
  _exp_year int,
  _master text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  UPDATE public.virtual_cards
     SET encrypted_number = extensions.pgp_sym_encrypt(_full_number, _master),
         encrypted_cvv    = extensions.pgp_sym_encrypt(_cvv, _master),
         last4 = _last4,
         bin = _bin,
         brand = _brand,
         expiry_month = _exp_month,
         expiry_year = _exp_year,
         updated_at = now()
   WHERE id = _card_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.provision_virtual_card(uuid, text, text, text, text, text, int, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_virtual_card(uuid, text, text, text, text, text, int, int, text) TO service_role;
