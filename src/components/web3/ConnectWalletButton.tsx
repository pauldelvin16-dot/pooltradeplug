import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown, LogOut } from "lucide-react";
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Persist wallet whenever it connects (and user signed in)
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

  if (requireAuth && !user) return null;
  if (authLoading || !hydrated) return <Skeleton className="h-9 w-32 rounded-md" />;

  return (
    <ConnectButton.Custom>
      {({ account, chain: rkChain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && !!account && !!rkChain;
        if (!ready) return <Skeleton className="h-9 w-32 rounded-md" />;
        if (!connected) {
          return (
            <Button onClick={openConnectModal} size="sm" className="gold-gradient text-primary-foreground font-semibold h-9 gap-2">
              <Wallet className="w-4 h-4" /> Connect Wallet
            </Button>
          );
        }
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-1.5 font-mono text-xs">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                {account.displayName}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card">
              <DropdownMenuLabel className="text-xs">
                {chain ? `${CHAIN_META[chain.id]?.logo || ""} ${chain.name}` : "Network"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">Switch network</DropdownMenuLabel>
              {SUPPORTED_CHAINS.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => switchChain({ chainId: c.id })}
                  className={chain?.id === c.id ? "bg-secondary/50" : ""}
                >
                  <span className="mr-2">{CHAIN_META[c.id]?.logo}</span>{c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openAccountModal}>
                <LogOut className="w-3.5 h-3.5 mr-2" /> Account / Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }}
    </ConnectButton.Custom>
  );
};

export default ConnectWalletButton;
