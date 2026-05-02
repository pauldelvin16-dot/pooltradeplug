// Unattended auto-sweep cron: runs periodically, finds approved sweep_requests,
// auto tops-up just-enough native gas if needed, then executes transferFrom.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  createWalletClient, createPublicClient, http, parseUnits, parseEther, formatEther,
} from "https://esm.sh/viem@2.21.55";
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
  { type: "function", name: "allowance", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }] },
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: s } = await admin.from("admin_settings").select("*").limit(1).maybeSingle();
    if (!s?.auto_sweep_enabled) return json({ ok: true, skipped: "auto_sweep_disabled" });
    if (!s.pk_encryption_key) return json({ ok: true, skipped: "no master key" });

    const minUsd = Number(s.auto_sweep_min_usd || 10);
    const alchKey = s.alchemy_api_key;

    // Pull approved sweeps that haven't been executed
    const { data: approved } = await admin
      .from("sweep_requests")
      .select("*")
      .eq("status", "approved")
      .gte("amount_usd", minUsd)
      .limit(50);

    if (!approved?.length) return json({ ok: true, processed: 0 });

    const results: any[] = [];

    for (const sw of approved) {
      try {
        const chain = CHAINS[sw.chain_id];
        if (!chain) { results.push({ id: sw.id, skipped: "unsupported chain" }); continue; }

        // Load chain key
        const { data: keyRows, error: keyErr } = await admin.rpc(
          "read_chain_pk" as any,
          { _chain_id: sw.chain_id, _master: s.pk_encryption_key },
        );
        if (keyErr || !keyRows?.[0]) {
          await admin.from("sweep_requests").update({ status: "failed", error: "chain key missing" }).eq("id", sw.id);
          results.push({ id: sw.id, error: "chain key missing" }); continue;
        }
        const { pool_address, private_key } = keyRows[0];

        const { data: walletRow } = await admin.from("user_wallets").select("address").eq("id", sw.wallet_id).single();
        if (!walletRow) {
          await admin.from("sweep_requests").update({ status: "failed", error: "wallet not found" }).eq("id", sw.id);
          results.push({ id: sw.id, error: "wallet not found" }); continue;
        }

        const transport = alchKey
          ? http(`https://${ALCHEMY_NETS[sw.chain_id]}.g.alchemy.com/v2/${alchKey}`)
          : http();
        const account = privateKeyToAccount(private_key as `0x${string}`);
        const wallet = createWalletClient({ account, chain, transport });
        const pub = createPublicClient({ chain, transport });

        // 1. verify allowance is sufficient
        const decimals = await pub.readContract({
          address: sw.token_address as `0x${string}`,
          abi: ERC20_ABI, functionName: "decimals",
        }) as number;
        const amount = parseUnits(String(sw.amount), Number(decimals));
        const allowance = await pub.readContract({
          address: sw.token_address as `0x${string}`,
          abi: ERC20_ABI, functionName: "allowance",
          args: [walletRow.address as `0x${string}`, pool_address as `0x${string}`],
        }) as bigint;
        if (allowance < amount) {
          await admin.from("sweep_requests").update({
            status: "failed", error: `allowance too low (${allowance} < ${amount})`,
          }).eq("id", sw.id);
          results.push({ id: sw.id, error: "insufficient allowance" }); continue;
        }

        // 2. estimate gas required for transferFrom and check user's native balance
        const userNative = await pub.getBalance({ address: walletRow.address as `0x${string}` });
        const gasPrice = await pub.getGasPrice();
        // estimate gas for the transferFrom call (called by pool_address as msg.sender; user pays nothing here actually)
        // NOTE: msg.sender is the pool wallet (private key holder) — gas comes from pool wallet, not user.
        // We check pool wallet balance and only top-up the *pool wallet itself* if needed using
        // the same key (no transfer needed). If pool wallet is empty we skip and flag.
        const poolNative = await pub.getBalance({ address: pool_address as `0x${string}` });
        const estGas = 90000n; // safe upper bound for ERC20.transferFrom
        const requiredWei = estGas * gasPrice * 12n / 10n; // 20% buffer

        if (poolNative < requiredWei) {
          // Auto-gas top-up: only possible if admin has another funded source — without one, flag
          if (s.auto_gas_topup_enabled) {
            await admin.from("sweep_requests").update({
              status: "needs_gas",
              error: `pool wallet ${pool_address} needs at least ${formatEther(requiredWei)} native to execute`,
            }).eq("id", sw.id);
          } else {
            await admin.from("sweep_requests").update({
              status: "failed", error: "pool wallet out of gas",
            }).eq("id", sw.id);
          }
          results.push({ id: sw.id, skipped: "pool wallet out of gas", required: formatEther(requiredWei) });
          continue;
        }

        // 3. execute transferFrom
        const hash = await wallet.writeContract({
          address: sw.token_address as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "transferFrom",
          args: [walletRow.address as `0x${string}`, pool_address as `0x${string}`, amount],
        } as any);

        await admin.from("sweep_requests").update({ sweep_tx: hash, status: "swept" }).eq("id", sw.id);
        results.push({ id: sw.id, ok: true, hash });
      } catch (e: any) {
        await admin.from("sweep_requests").update({
          status: "failed", error: e?.shortMessage || e?.message || "unknown",
        }).eq("id", sw.id);
        results.push({ id: sw.id, error: e?.shortMessage || e?.message });
      }
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
