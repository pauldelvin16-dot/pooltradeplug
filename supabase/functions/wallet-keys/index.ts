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
    const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", userRes.user.id);
    if (!(roles || []).some((r: any) => r.role === "admin")) return json({ error: "forbidden" }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, chainId, chainName, poolAddress, privateKey, notes } = await req.json();

    const { data: settings } = await admin.from("admin_settings").select("id,pk_encryption_key").limit(1).maybeSingle();
    let master = settings?.pk_encryption_key;
    // Auto-generate master key on first use so admins don't have to think about it.
    if (!master && settings?.id) {
      const buf = new Uint8Array(48);
      crypto.getRandomValues(buf);
      master = Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
      await admin.from("admin_settings").update({ pk_encryption_key: master }).eq("id", settings.id);
    }

    if (action === "upsert") {
      if (!master) return json({ error: "Settings row missing" }, 400);
      if (!privateKey?.startsWith("0x") || privateKey.length !== 66) return json({ error: "Invalid private key (expect 0x + 64 hex)" }, 400);
      if (!poolAddress?.startsWith("0x")) return json({ error: "Invalid pool address" }, 400);
      const { error } = await admin.rpc("upsert_chain_key" as any, {
        _chain_id: chainId, _chain_name: chainName, _pool: poolAddress, _pk: privateKey, _notes: notes || null, _master: master,
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    if (action === "delete") {
      const { error } = await admin.from("pool_chain_keys").delete().eq("chain_id", chainId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e: any) { return json({ error: e.message }, 500); }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
