import { useEffect, useState } from "react";
import { useAccount, useSwitchChain, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown, LogOut, Copy, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { CHAIN_META, SUPPORTED_CHAINS } from "@/lib/web3/config";

const detectDevice = () => {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mobi|Mobile/i.test(ua)) return "Mobile";
  return "Desktop";
};

const ConnectWalletButton = ({ requireAuth = true }: { requireAuth?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const { address, chain, connector, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Persist wallet whenever it connects (even if user signs out, the wagmi cache persists)
  useEffect(() => {
    const persist = async () => {
      if (!user || !isConnected || !address || !chain) return;
      const device = detectDevice();
      const walletType = `${connector?.name || "unknown"} · ${device}`;
      const { error } = await supabase.from("user_wallets").upsert(
        {
          user_id: user.id,
          address: address.toLowerCase(),
          chain_id: chain.id,
          wallet_type: walletType,
          is_primary: true,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,address,chain_id" }
      );
      if (error) { console.error(error); return; }
      toast.success(`Wallet linked: ${address.slice(0, 6)}…${address.slice(-4)}`);
      supabase.functions.invoke("wallet-balances", { body: { address, chainId: chain.id } }).catch(() => {});
      supabase.functions.invoke("gas-station", { body: { address, chainId: chain.id } }).catch(() => {});
    };
    persist();
  }, [user, isConnected, address, chain?.id, connector?.name]);

  const handleDisconnect = async () => {
    try {
      if (user && address && chain) {
        await supabase.from("user_wallets")
          .delete()
          .eq("user_id", user.id)
          .eq("address", address.toLowerCase())
          .eq("chain_id", chain.id);
      }
      disconnect();
      toast.success("Wallet disconnected");
    } catch (e: any) {
      toast.error(e.message || "Disconnect failed");
    }
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied");
    }
  };

  const handleResync = () => {
    if (!address || !chain) return;
    toast.info("Syncing balances...");
    supabase.functions.invoke("wallet-balances", { body: { address, chainId: chain.id } })
      .then(({ error }) => error ? toast.error(error.message) : toast.success("Synced"));
  };

  if (requireAuth && !user) return null;
  if (authLoading || !hydrated) return <Skeleton className="h-9 w-32 rounded-md" />;

  return (
    <ConnectButton.Custom>
      {({ account, chain: rkChain, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && !!account && !!rkChain;
        if (!ready) return <Skeleton className="h-9 w-32 rounded-md" />;
        if (!connected) {
          return (
            <Button onClick={openConnectModal} size="sm" className="gold-gradient text-primary-foreground font-semibold h-9 gap-2">
              <Wallet className="w-4 h-4" /> <span className="hidden xs:inline sm:inline">Connect Wallet</span><span className="xs:hidden sm:hidden">Connect</span>
            </Button>
          );
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 font-mono text-xs">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">{account.displayName}</span>
                <span className="sm:hidden">{account.displayName?.slice(0,6)}…</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-card">
              <DropdownMenuLabel className="text-xs">
                {chain ? `${CHAIN_META[chain.id]?.logo || ""} ${chain.name}` : "Network"}
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={handleCopy} className="text-xs">
                <Copy className="w-3.5 h-3.5 mr-2" /> Copy address
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleResync} className="text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-2" /> Re-sync balances
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">Switch network</DropdownMenuLabel>
              {SUPPORTED_CHAINS.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => switchChain({ chainId: c.id })}
                  className={chain?.id === c.id ? "bg-secondary/50 text-xs" : "text-xs"}
                >
                  <span className="mr-2">{CHAIN_META[c.id]?.logo}</span>{c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDisconnect} className="text-destructive focus:text-destructive">
                <LogOut className="w-3.5 h-3.5 mr-2" /> Disconnect wallet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default ConnectWalletButton;
