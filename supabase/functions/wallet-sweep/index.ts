import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createWalletClient, createPublicClient, http, parseUnits, encodeFunctionData } from "https://esm.sh/viem@2.21.55";
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

const ERC20_ABI = [
  { type: "function", name: "transferFrom", stateMutability: "nonpayable",
    inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

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
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, poolId, minUsd = 0, sweepId } = await req.json();
    const { data: settings } = await admin.from("admin_settings").select("pk_encryption_key,alchemy_api_key").limit(1).maybeSingle();
    if (!settings?.pk_encryption_key) return json({ error: "encryption key missing" }, 400);

    if (action === "create_requests") {
      // Find participants of pool, find their wallets w/ stablecoin balance >= minUsd, create rows
      const { data: parts } = await admin.from("pool_participants").select("user_id").eq("pool_id", poolId);
      const userIds = (parts || []).map((p: any) => p.user_id);
      if (!userIds.length) return json({ error: "no participants" }, 400);
      const { data: wallets } = await admin.from("user_wallets").select("id,user_id,address,chain_id,user_wallet_assets(*)").in("user_id", userIds);
      let created = 0;
      for (const w of wallets || []) {
        for (const a of (w as any).user_wallet_assets || []) {
          if (parseFloat(a.balance_usd) < minUsd) continue;
          if (a.is_native) continue; // can't transferFrom native
          const { error } = await admin.from("sweep_requests").insert({
            pool_id: poolId, user_id: (w as any).user_id, wallet_id: (w as any).id,
            chain_id: (w as any).chain_id, token_address: a.token_address, symbol: a.symbol,
            amount: a.balance, amount_usd: a.balance_usd, status: "pending",
            triggered_by: userRes.user.id,
          });
          if (!error) created++;
        }
      }
      return json({ ok: true, created });
    }

    if (action === "execute") {
      const { data: sw } = await admin.from("sweep_requests").select("*").eq("id", sweepId).single();
      if (!sw) return json({ error: "not found" }, 404);
      if (sw.status !== "approved") return json({ error: `state must be approved (got ${sw.status})` }, 400);
      const { data: walletRow } = await admin.from("user_wallets").select("address").eq("id", sw.wallet_id).single();
      const { data: keyRows, error: keyErr } = await admin.rpc("read_chain_pk" as any, { _chain_id: sw.chain_id, _master: settings.pk_encryption_key });
      if (keyErr || !keyRows?.[0]) return json({ error: "chain key missing/invalid" }, 400);
      const { pool_address, private_key } = keyRows[0];

      const chain = CHAINS[sw.chain_id];
      const alchKey = settings.alchemy_api_key;
      const transport = alchKey ? http(`https://${ALCHEMY_NETS[sw.chain_id]}.g.alchemy.com/v2/${alchKey}`) : http();
      const account = privateKeyToAccount(private_key as `0x${string}`);
      const wallet = createWalletClient({ account, chain, transport });
      const pub = createPublicClient({ chain, transport });

      // Resolve decimals
      const decimals = await pub.readContract({ address: sw.token_address as `0x${string}`, abi: ERC20_ABI, functionName: "decimals" }) as number;
      const amount = parseUnits(String(sw.amount), Number(decimals));

      try {
        const hash = await wallet.writeContract({
          address: sw.token_address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transferFrom",
          args: [walletRow!.address as `0x${string}`, pool_address as `0x${string}`, amount],
        } as any);
        await admin.from("sweep_requests").update({ sweep_tx: hash, status: "swept" }).eq("id", sweepId);
        return json({ ok: true, hash });
      } catch (e: any) {
        await admin.from("sweep_requests").update({ status: "failed", error: e?.shortMessage || e?.message }).eq("id", sweepId);
        return json({ error: e?.shortMessage || e?.message }, 500);
      }
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) { return json({ error: e.message }, 500); }
});

function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
