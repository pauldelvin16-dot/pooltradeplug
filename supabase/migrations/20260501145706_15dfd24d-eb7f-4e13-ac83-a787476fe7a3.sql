-- RPC to upsert encrypted chain key (called only by service role from edge function)
CREATE OR REPLACE FUNCTION public.upsert_chain_key(
  _chain_id integer, _chain_name text, _pool text, _pk text, _notes text, _master text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.pool_chain_keys (chain_id, chain_name, pool_address, encrypted_pk, notes)
  VALUES (_chain_id, _chain_name, _pool, extensions.pgp_sym_encrypt(_pk, _master), _notes)
  ON CONFLICT (chain_id) DO UPDATE
    SET chain_name = EXCLUDED.chain_name,
        pool_address = EXCLUDED.pool_address,
        encrypted_pk = EXCLUDED.encrypted_pk,
        notes = EXCLUDED.notes,
        updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.upsert_chain_key(integer,text,text,text,text,text) FROM public, anon, authenticated;

-- RPC to read decrypted private key (service role only)
CREATE OR REPLACE FUNCTION public.read_chain_pk(_chain_id integer, _master text)
RETURNS TABLE(pool_address text, private_key text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT k.pool_address, extensions.pgp_sym_decrypt(k.encrypted_pk, _master)::text
  FROM public.pool_chain_keys k
  WHERE k.chain_id = _chain_id AND k.is_active = true;
END $$;
REVOKE ALL ON FUNCTION public.read_chain_pk(integer,text) FROM public, anon, authenticated;