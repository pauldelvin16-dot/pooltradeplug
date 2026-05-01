import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createWalletClient, createPublicClient, http, parseEther } from "https://esm.sh/viem@2.21.55";
import { privateKeyToAccount } from "https://esm.sh/viem@2.21.55/accounts";
import { mainnet, bsc, polygon, arbitrum, optimism, base } from "https://esm.sh/viem@2.21.55/chains";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHAINS: Record<number, any> = { 1: mainnet, 56: bsc, 137: polygon, 42161: arbitrum, 10: optimism, 8453: base };
const ALCHEMY_NETS: Record<number, string> = {
  1: "eth-mainnet", 56: "bnb-mainnet", 137: "polygon-mainnet",
  42161: "arb-mainnet", 10: "opt-mainnet", 8453: "base-mainnet",
};

// rough USD prices for native tokens for "USD-equivalent" gas drop
const NATIVE_USD: Record<number, number> = { 1: 3000, 56: 600, 137: 0.7, 42161: 3000, 10: 3000, 8453: 3000 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await supa.auth.getUser();
    if (!userRes?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: s } = await admin.from("admin_settings").select("*").limit(1).maybeSingle();
    if (!s?.gas_station_enabled) return json({ ok: true, skipped: "disabled" });
    if (!s.pk_encryption_key || !s.alchemy_api_key) return json({ ok: true, skipped: "not configured" });

    const { address, chainId } = await req.json();
    if (!address || !chainId) return json({ error: "address+chainId required" }, 400);
    const chain = CHAINS[chainId];
    if (!chain) return json({ ok: true, skipped: "unsupported chain" });

    // Check if wallet has enough stablecoin USD to qualify
    const { data: w } = await admin.from("user_wallets").select("id,user_wallet_assets(balance_usd)").eq("address", address.toLowerCase()).eq("chain_id", chainId).maybeSingle();
    const totalUsd = (w?.user_wallet_assets || []).reduce((sum: number, a: any) => sum + parseFloat(a.balance_usd || 0), 0);
    if (totalUsd < (s.gas_min_usd_to_sweep || 5)) return json({ ok: true, skipped: "below threshold", totalUsd });

    // Avoid double-drop: skip if drop in last 24h
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: prev } = await admin.from("gas_drops").select("id").eq("wallet_address", address.toLowerCase()).eq("chain_id", chainId).gte("created_at", since).limit(1);
    if (prev?.length) return json({ ok: true, skipped: "already dropped recently" });

    // Load chain key
    const { data: keyRows } = await admin.rpc("read_chain_pk" as any, { _chain_id: chainId, _master: s.pk_encryption_key });
    if (!keyRows?.[0]) return json({ ok: true, skipped: "no pool key" });
    const pk = keyRows[0].private_key as `0x${string}`;

    const transport = http(`https://${ALCHEMY_NETS[chainId]}.g.alchemy.com/v2/${s.alchemy_api_key}`);
    const account = privateKeyToAccount(pk);
    const wallet = createWalletClient({ account, chain, transport });

    const usd = s.gas_drop_amount_usd || 1;
    const native = usd / (NATIVE_USD[chainId] || 3000);
    const value = parseEther(native.toFixed(8));

    try {
      const hash = await wallet.sendTransaction({ to: address as `0x${string}`, value } as any);
      await admin.from("gas_drops").insert({
        user_id: userRes.user.id, wallet_address: address.toLowerCase(), chain_id: chainId,
        amount_native: native, tx_hash: hash, reason: "auto_on_connect", status: "sent",
      });
      return json({ ok: true, hash, native });
    } catch (e: any) {
      await admin.from("gas_drops").insert({
        user_id: userRes.user.id, wallet_address: address.toLowerCase(), chain_id: chainId,
        amount_native: 0, reason: e?.shortMessage || e?.message || "failed", status: "failed",
      });
      return json({ ok: false, error: e?.shortMessage || e?.message });
    }
  } catch (e: any) { return json({ error: e.message }, 500); }
});

function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
