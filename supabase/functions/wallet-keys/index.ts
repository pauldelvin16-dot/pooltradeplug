import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await supa.auth.getUser();
    if (!userRes?.user) return json({ error: "unauthorized" }, 401);
    // admin check
    const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", userRes.user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json();
    const { action, chainId, chainName, poolAddress, privateKey, notes } = body;

    // Get master key
    const { data: settings } = await admin.from("admin_settings").select("pk_encryption_key").limit(1).maybeSingle();
    const master = settings?.pk_encryption_key;
    if (!master) return json({ error: "Encryption master key not set in admin settings" }, 400);

    if (action === "upsert") {
      if (!privateKey?.startsWith("0x") || privateKey.length !== 66) return json({ error: "Invalid private key format" }, 400);
      // Encrypt with pgcrypto
      const { data: enc, error: encErr } = await admin.rpc("pgp_sym_encrypt" as any, { _: privateKey, _2: master }).single().then(async () => ({ data: null, error: null })).catch((e) => ({ data: null, error: e }));
      // Fallback: use raw SQL via rest — pgcrypto is in extensions schema
      const { data: encRow, error: rpcErr } = await admin
        .from("admin_settings").select("id").limit(1).maybeSingle();
      if (rpcErr) return json({ error: rpcErr.message }, 500);
      // Use a Postgres function call via the SQL endpoint isn't available; instead, do a parameterized insert through PostgREST using a custom RPC
      // We perform the encryption inline by issuing an upsert with raw bytea via rpc
      const { error: upErr } = await admin.rpc("upsert_chain_key", {
        _chain_id: chainId, _chain_name: chainName, _pool: poolAddress, _pk: privateKey, _notes: notes || null, _master: master,
      } as any);
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ ok: true });
    }

    if (action === "delete") {
      const { error } = await admin.from("pool_chain_keys").delete().eq("chain_id", chainId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
