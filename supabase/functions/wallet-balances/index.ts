import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALCHEMY_NETS: Record<number, string> = {
  1: "eth-mainnet", 56: "bnb-mainnet", 137: "polygon-mainnet",
  42161: "arb-mainnet", 10: "opt-mainnet", 8453: "base-mainnet",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !sk) return json({ ok: false, error: "Server misconfigured: missing SUPABASE env vars" }, 200);
    const admin = createClient(url, sk);
    const { data: settings, error: setErr } = await admin.from("admin_settings").select("alchemy_api_key").limit(1).maybeSingle();
    if (setErr) return json({ ok: false, error: `Settings read failed: ${setErr.message}` }, 200);
    const key = settings?.alchemy_api_key;
    if (!key) return json({ ok: false, error: "Alchemy API key not configured in Admin → Web3 settings" }, 200);

    const { address, chainId, walletId, syncAll } = await req.json().catch(() => ({}));

    const targets: Array<{ id: string; address: string; chain_id: number }> = [];
    if (syncAll) {
      const { data } = await admin.from("user_wallets").select("id,address,chain_id").limit(500);
      (data || []).forEach((w: any) => targets.push(w));
    } else if (address && chainId) {
      let id = walletId;
      if (!id) {
        const { data } = await admin.from("user_wallets").select("id").eq("address", address.toLowerCase()).eq("chain_id", chainId).maybeSingle();
        id = data?.id;
      }
      if (id) targets.push({ id, address, chain_id: chainId });
    } else return json({ error: "address+chainId or syncAll required" }, 400);

    let synced = 0;
    for (const t of targets) {
      const net = ALCHEMY_NETS[t.chain_id];
      if (!net) continue;
      const url = `https://${net}.g.alchemy.com/v2/${key}`;
      try {
        // native balance
        const nat = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [t.address, "latest"] }),
        }).then(r => r.json());
        const wei = BigInt(nat.result || "0x0");
        const native = Number(wei) / 1e18;

        // token balances (ERC-20)
        const tok = await fetch(url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "alchemy_getTokenBalances", params: [t.address] }),
        }).then(r => r.json());

        const assets: any[] = [{
          wallet_id: t.id, chain_id: t.chain_id, token_address: null,
          symbol: chainSymbol(t.chain_id), decimals: 18, balance: native, balance_usd: 0, is_native: true,
        }];

        const balances = (tok?.result?.tokenBalances || []).filter((b: any) => b.tokenBalance && b.tokenBalance !== "0x0");
        for (const b of balances.slice(0, 50)) {
          const meta = await fetch(url, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "alchemy_getTokenMetadata", params: [b.contractAddress] }),
          }).then(r => r.json());
          const decimals = meta?.result?.decimals ?? 18;
          const symbol = meta?.result?.symbol || "TOKEN";
          const bal = Number(BigInt(b.tokenBalance)) / 10 ** decimals;
          assets.push({
            wallet_id: t.id, chain_id: t.chain_id, token_address: b.contractAddress,
            symbol, decimals, balance: bal, balance_usd: stableUsd(symbol, bal), is_native: false,
          });
        }

        // Replace assets snapshot
        await admin.from("user_wallet_assets").delete().eq("wallet_id", t.id);
        if (assets.length) await admin.from("user_wallet_assets").insert(assets);
        const totalUsd = assets.reduce((s, a) => s + (a.balance_usd || 0), 0);
        await admin.from("user_wallets").update({ last_synced_at: new Date().toISOString(), last_seen_balance_usd: totalUsd }).eq("id", t.id);
        synced++;
      } catch (e) { console.error("sync err", t.address, e); }
    }
    return json({ ok: true, synced });
  } catch (e: any) { return json({ error: e.message }, 500); }
});

function chainSymbol(id: number) {
  return ({ 1: "ETH", 56: "BNB", 137: "MATIC", 42161: "ETH", 10: "ETH", 8453: "ETH" } as any)[id] || "ETH";
}
function stableUsd(symbol: string, amt: number) {
  const stable = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDP"];
  return stable.includes(symbol.toUpperCase()) ? amt : 0;
}
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
