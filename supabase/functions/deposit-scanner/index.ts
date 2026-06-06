import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NETWORKS: Record<string, string> = {
  ERC20: "eth-mainnet",
  Ethereum: "eth-mainnet",
  BEP20: "bnb-mainnet",
  BSC: "bnb-mainnet",
  Polygon: "polygon-mainnet",
  MATIC: "polygon-mainnet",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ ok: false, error: "Server misconfigured" }, 200);

    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service);
    const { data: userRes } = await client.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ ok: false, error: "Not authenticated" }, 401);

    const { depositId } = await req.json().catch(() => ({}));
    if (!depositId || typeof depositId !== "string") return json({ ok: false, error: "depositId required" }, 400);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");

    const { data: deposit, error: depErr } = await admin
      .from("deposits")
      .select("*, crypto_addresses(address, network, currency)")
      .eq("id", depositId)
      .maybeSingle();
    if (depErr) return json({ ok: false, error: depErr.message }, 200);
    if (!deposit) return json({ ok: false, error: "Deposit not found" }, 404);
    if (!isAdmin && deposit.user_id !== user.id) return json({ ok: false, error: "Forbidden" }, 403);
    if (deposit.status === "confirmed") return json({ ok: true, confirmed: true, message: "Already confirmed" });
    if (deposit.status !== "pending") return json({ ok: false, error: `Deposit is ${deposit.status}` }, 200);

    const expiresAt = deposit.expires_at ? new Date(deposit.expires_at).getTime() : Date.now() + 1;
    if (Date.now() > expiresAt) {
      await admin.from("deposits").update({ status: "expired" }).eq("id", deposit.id).eq("status", "pending");
      return json({ ok: true, confirmed: false, expired: true, message: "Deposit window expired" });
    }

    const settings = await admin.from("admin_settings").select("alchemy_api_key").limit(1).maybeSingle();
    const key = settings.data?.alchemy_api_key;
    if (!key) return json({ ok: false, error: "Alchemy API key is not configured" }, 200);

    const network = deposit.crypto_addresses?.network || deposit.network;
    const alchemyNet = NETWORKS[network];
    if (!alchemyNet) {
      return json({ ok: true, confirmed: false, unsupported: true, message: `${network} requires admin confirmation or a matching scanner provider.` });
    }

    const toAddress = String(deposit.crypto_addresses?.address || "").toLowerCase();
    const expected = Number(deposit.amount || 0);
    const currency = String(deposit.crypto_addresses?.currency || deposit.currency || "USDT").toUpperCase();
    const start = new Date(deposit.created_at).getTime() - 120_000;
    const end = expiresAt + 120_000;
    const rpc = `https://${alchemyNet}.g.alchemy.com/v2/${key}`;
    const transfers = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          toAddress,
          category: ["erc20", "external"],
          withMetadata: true,
          excludeZeroValue: true,
          order: "desc",
          maxCount: "0x64",
        }],
      }),
    }).then((r) => r.json());

    if (transfers.error) return json({ ok: false, error: transfers.error.message || "Alchemy scan failed" }, 200);
    const match = (transfers.result?.transfers || []).find((tx: any) => {
      const ts = tx.metadata?.blockTimestamp ? new Date(tx.metadata.blockTimestamp).getTime() : 0;
      const asset = String(tx.asset || "").toUpperCase();
      const value = Number(tx.value || 0);
      return ts >= start && ts <= end && value >= expected * 0.995 && (asset === currency || (currency === "USDT" && ["USDT", "USDC"].includes(asset)));
    });

    if (!match) return json({ ok: true, confirmed: false, scanned: true, message: "No matching transfer detected yet" });

    const { data: current } = await admin.from("deposits").select("status").eq("id", deposit.id).maybeSingle();
    if (current?.status === "confirmed") return json({ ok: true, confirmed: true, message: "Already confirmed" });

    const txid = match.hash || match.uniqueId;
    const { error: updErr } = await admin.from("deposits").update({ status: "confirmed", txid, admin_note: "Auto-confirmed by Alchemy deposit scanner" }).eq("id", deposit.id).eq("status", "pending");
    if (updErr) return json({ ok: false, error: updErr.message }, 200);

    const { data: profile } = await admin.from("profiles").select("balance").eq("user_id", deposit.user_id).maybeSingle();
    await admin.from("profiles").update({ balance: Number(profile?.balance || 0) + expected }).eq("user_id", deposit.user_id);

    return json({ ok: true, confirmed: true, txid, value: match.value, asset: match.asset });
  } catch (e: any) {
    console.error("deposit-scanner fatal", e);
    return json({ ok: false, error: e?.message || String(e) }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}