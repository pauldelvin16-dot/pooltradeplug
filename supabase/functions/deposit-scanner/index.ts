import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Alchemy network slugs for every supported deposit network.
// The single admin-managed Alchemy key (admin_settings.alchemy_api_key) validates ALL of these.
const NETWORKS: Record<string, string> = {
  ERC20: "eth-mainnet",
  Ethereum: "eth-mainnet",
  ETH: "eth-mainnet",
  BEP20: "bnb-mainnet",
  BSC: "bnb-mainnet",
  BNB: "bnb-mainnet",
  Polygon: "polygon-mainnet",
  MATIC: "polygon-mainnet",
  Arbitrum: "arb-mainnet",
  ARB: "arb-mainnet",
  Optimism: "opt-mainnet",
  OP: "opt-mainnet",
  Base: "base-mainnet",
  BASE: "base-mainnet",
};

const NATIVE_SYMBOLS: Record<string, string> = {
  "eth-mainnet": "ETH",
  "bnb-mainnet": "BNB",
  "polygon-mainnet": "MATIC",
  "arb-mainnet": "ETH",
  "opt-mainnet": "ETH",
  "base-mainnet": "ETH",
};

// Verified stablecoin contracts per Alchemy network (lowercase).
// Critical: matching by asset SYMBOL alone is spoofable — anyone can deploy a token
// named "USDT". We require the exact official contract address for known assets.
const TOKEN_CONTRACTS: Record<string, Record<string, string[]>> = {
  "eth-mainnet": {
    USDT: ["0xdac17f958d2ee523a2206206994597c13d831ec7"],
    USDC: ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
  },
  "bnb-mainnet": {
    USDT: ["0x55d398326f99059ff775485246999027b3197955"],
    USDC: ["0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"],
  },
  "polygon-mainnet": {
    USDT: ["0xc2132d05d31c914a87c6611c10748aeb04b58e8f"],
    USDC: [
      "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", // native USDC
      "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC.e (bridged)
    ],
  },
  "arb-mainnet": {
    USDT: ["0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9"],
    USDC: [
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // native USDC
      "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8", // USDC.e (bridged)
    ],
  },
  "opt-mainnet": {
    USDT: ["0x94b008aa00579c1307b0ef2c499ad98a8ce58e58"],
    USDC: [
      "0x0b2c639c533813f4aa9d7837caf62653d097ff85", // native USDC
      "0x7f5c764cbc14f9669b88837ca1490cca17c31607", // USDC.e (bridged)
    ],
  },
  "base-mainnet": {
    USDT: ["0xfde4c96c8593536e31f229ea8f37b2ada2699bb2"],
    USDC: [
      "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // native USDC
      "0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca", // USDbC (bridged)
    ],
  },
};

async function rpcCall(rpc: string, method: string, params: unknown[], retries = 2): Promise<any> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      return await r.json();
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 400 * (i + 1)));
    }
  }
  throw lastErr;
}

// Pull up to 3 pages of inbound transfers (300 txs) so busy deposit addresses still find the match.
async function fetchTransfers(rpc: string, toAddress: string): Promise<any[]> {
  const all: any[] = [];
  let pageKey: string | undefined;
  for (let page = 0; page < 3; page++) {
    const params: Record<string, unknown> = {
      toAddress,
      category: ["erc20", "external"],
      withMetadata: true,
      excludeZeroValue: true,
      order: "desc",
      maxCount: "0x64",
    };
    if (pageKey) params.pageKey = pageKey;
    const res = await rpcCall(rpc, "alchemy_getAssetTransfers", [params]);
    if (res.error) throw new Error(res.error.message || "Alchemy scan failed");
    all.push(...(res.result?.transfers || []));
    pageKey = res.result?.pageKey;
    if (!pageKey) break;
  }
  return all;
}

// Scans one pending deposit on-chain. Returns a per-deposit result object; never throws on business logic.
async function scanDeposit(admin: any, deposit: any, key: string): Promise<any> {
  const id = deposit.id;
  if (deposit.status !== "pending") return { id, skipped: `status ${deposit.status}` };

  const expiresAt = deposit.expires_at ? new Date(deposit.expires_at).getTime() : Date.now() + 1;
  if (Date.now() > expiresAt) {
    await admin.from("deposits").update({ status: "expired" }).eq("id", id).eq("status", "pending");
    return { id, expired: true };
  }

  const network = deposit.crypto_addresses?.network || deposit.network;
  const alchemyNet = NETWORKS[network];
  if (!alchemyNet) return { id, unsupported: true, network };

  const toAddress = String(deposit.crypto_addresses?.address || "").toLowerCase();
  if (!toAddress) return { id, error: "no destination address" };

  const expected = Number(deposit.amount || 0);
  const currency = String(deposit.crypto_addresses?.currency || deposit.currency || "USDT").toUpperCase();
  const start = new Date(deposit.created_at).getTime() - 120_000;
  const end = expiresAt + 120_000;
  const rpc = `https://${alchemyNet}.g.alchemy.com/v2/${key}`;

  const transfers = await fetchTransfers(rpc, toAddress);
  const validAssets = currency === "USDT" ? ["USDT", "USDC"] : [currency];

  const match = transfers.find((tx: any) => {
    const ts = tx.metadata?.blockTimestamp ? new Date(tx.metadata.blockTimestamp).getTime() : 0;
    if (ts < start || ts > end) return false;
    const value = Number(tx.value || 0);
    // Match the UNIQUE invoice amount tightly so we identify this exact deposit without a TXID.
    if (Math.abs(value - expected) > 0.0005) return false;
    const asset = String(tx.asset || "").toUpperCase();
    if (tx.category === "external") {
      return asset === NATIVE_SYMBOLS[alchemyNet];
    }
    const contract = String(tx.rawContract?.address || "").toLowerCase();
    const allowlist = (a: string) => TOKEN_CONTRACTS[alchemyNet]?.[a] || [];
    // Verified contract match for known stablecoins; symbol fallback only for assets we don't track.
    return validAssets.some((a) =>
      allowlist(a).length > 0 ? allowlist(a).includes(contract) : asset === a
    );
  });

  if (!match) return { id, confirmed: false, scanned: true, transfersChecked: transfers.length };

  const { data: current } = await admin.from("deposits").select("status").eq("id", id).maybeSingle();
  if (current?.status === "confirmed") return { id, confirmed: true, message: "Already confirmed" };

  const txid = match.hash || match.uniqueId;
  const { error: updErr } = await admin
    .from("deposits")
    .update({ status: "confirmed", txid, admin_note: `Auto-confirmed by Alchemy scanner (${alchemyNet})` })
    .eq("id", id)
    .eq("status", "pending");
  if (updErr) return { id, error: updErr.message };

  const { data: profile } = await admin.from("profiles").select("balance").eq("user_id", deposit.user_id).maybeSingle();
  await admin.from("profiles").update({ balance: Number(profile?.balance || 0) + expected }).eq("user_id", deposit.user_id);

  return { id, confirmed: true, txid, value: match.value, asset: match.asset, network: alchemyNet };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ ok: false, error: "Server misconfigured" }, 200);

    const admin = createClient(url, service);
    const body = await req.json().catch(() => ({}));
    const { depositId, scanAll } = body || {};

    const settings = await admin.from("admin_settings").select("alchemy_api_key").limit(1).maybeSingle();
    const key = settings.data?.alchemy_api_key;
    if (!key) return json({ ok: false, error: "Alchemy API key is not configured" }, 200);

    // BATCH MODE — invoked by the 2-minute cron. Idempotent and safe to call with the
    // publishable key: it only ever credits deposits that have a VERIFIED on-chain
    // transfer of the exact unique invoice amount to the exact deposit address.
    if (scanAll === true) {
      const cutoff = new Date(Date.now() - 60_000).toISOString(); // give fresh invoices 60s before first scan
      const { data: pending } = await admin
        .from("deposits")
        .select("*, crypto_addresses(address, network, currency)")
        .eq("status", "pending")
        .lt("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(20);

      const results: any[] = [];
      for (const dep of pending || []) {
        try {
          results.push(await scanDeposit(admin, dep, key));
        } catch (e: any) {
          results.push({ id: dep.id, error: e?.message || String(e) });
        }
      }
      return json({
        ok: true,
        mode: "batch",
        scanned: (pending || []).length,
        confirmed: results.filter((r) => r.confirmed).length,
        expired: results.filter((r) => r.expired).length,
        results,
      });
    }

    // SINGLE-DEPOSIT MODE — invoked from the app; caller must own the deposit or be admin.
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userRes } = await client.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ ok: false, error: "Not authenticated" }, 401);
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

    const network = deposit.crypto_addresses?.network || deposit.network;
    if (!NETWORKS[network]) {
      return json({ ok: true, confirmed: false, unsupported: true, message: `${network} requires admin confirmation or a matching scanner provider.` });
    }

    const result = await scanDeposit(admin, deposit, key);
    if (result.error) return json({ ok: false, error: result.error }, 200);
    if (result.expired) return json({ ok: true, confirmed: false, expired: true, message: "Deposit window expired" });
    if (!result.confirmed) return json({ ok: true, confirmed: false, scanned: true, message: "No matching transfer detected yet" });
    return json({ ok: true, confirmed: true, txid: result.txid, value: result.value, asset: result.asset });
  } catch (e: any) {
    console.error("deposit-scanner fatal", e);
    return json({ ok: false, error: e?.message || String(e) }, 200);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
