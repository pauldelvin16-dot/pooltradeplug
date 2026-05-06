import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useSwitchChain, useDisconnect, useConnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown, LogOut, Copy, RefreshCw, AlertTriangle, Smartphone, Monitor } from "lucide-react";
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

const detectInstalledWallets = () => {
  const eth = (window as any).ethereum;
  const providers = eth?.providers?.length ? eth.providers : eth ? [eth] : [];
  const names = new Set<string>();
  providers.forEach((p: any) => {
    if (p?.isMetaMask) names.add("MetaMask");
    if (p?.isCoinbaseWallet) names.add("Coinbase");
    if (p?.isTrust || p?.isTrustWallet) names.add("Trust Wallet");
    if (p?.isRabby) names.add("Rabby");
    if (p?.isBraveWallet) names.add("Brave Wallet");
    if (p?.isPhantom) names.add("Phantom");
  });
  if (!names.size && providers.length) names.add("Browser wallet");
  return Array.from(names);
};

const ConnectWalletButton = ({ requireAuth = true }: { requireAuth?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const { data: settings } = useAdminSettings();
  const { address, chain, connector, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { status: connectStatus, error: connectError, reset: resetConnect } = useConnect();
  const [hydrated, setHydrated] = useState(false);
  const [handshake, setHandshake] = useState<{ state: "idle" | "pending" | "ok" | "error"; message?: string; at?: number }>({ state: "idle" });
  const handshakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttempts = useRef(0);

  const projectIdValid = /^[a-f0-9]{32}$/i.test(settings?.web3_project_id || "");
  const web3Ready = settings?.web3_enabled !== false && projectIdValid;
  const installedWallets = useMemo(() => detectInstalledWallets(), [hydrated]);
  const isMobileDevice = useMemo(() => /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || ""), []);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Track handshake lifecycle: pending → ok | error (with auto-retry once on mobile when deep-link returns no session)
  useEffect(() => {
    if (connectStatus === "pending") {
      setHandshake({ state: "pending", message: isMobileDevice ? "Opening WalletConnect handshake…" : "Opening wallet handshake…", at: Date.now() });
      if (handshakeTimer.current) clearTimeout(handshakeTimer.current);
      // If still pending after 25s without `isConnected`, mark as error and retry once on mobile
      handshakeTimer.current = setTimeout(() => {
        if (!isConnected) {
          setHandshake({ state: "error", message: "Handshake timed out — wallet did not return a session.", at: Date.now() });
          if (isMobileDevice && retryAttempts.current < 1) {
            retryAttempts.current += 1;
            try { resetConnect(); } catch (_) {}
            toast.message("Retrying wallet handshake…");
          }
        }
      }, 25000);
    } else if (connectStatus === "success" && isConnected) {
      if (handshakeTimer.current) clearTimeout(handshakeTimer.current);
      setHandshake({ state: "ok", message: "Connected", at: Date.now() });
      retryAttempts.current = 0;
    } else if (connectStatus === "error") {
      if (handshakeTimer.current) clearTimeout(handshakeTimer.current);
      setHandshake({ state: "error", message: connectError?.message || "Wallet connection failed.", at: Date.now() });
    }
    return () => { if (handshakeTimer.current) clearTimeout(handshakeTimer.current); };
  }, [connectStatus, connectError, isConnected, resetConnect, isMobileDevice]);


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
          if (!web3Ready) {
            return (
              <Button
                size="sm"
                variant="outline"
                onClick={() => toast.error(!projectIdValid ? "Wallet connection disabled — admin must set a valid 32-hex WalletConnect Project ID" : "Wallet connection disabled — admin must enable Web3 features")}
                className="h-9 gap-2 border-destructive/40 text-destructive"
              >
                <AlertTriangle className="w-4 h-4" /> <span className="hidden sm:inline">Wallets Unavailable</span><span className="sm:hidden">N/A</span>
              </Button>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <Button onClick={() => { setHandshake({ state: "pending", message: "WalletConnect modal opened", at: Date.now() }); openConnectModal(); }} size="sm" disabled={handshake.state === "pending"} className="gold-gradient text-primary-foreground font-semibold h-9 gap-2">
                <Wallet className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{handshake.state === "pending" ? "Opening…" : "Connect Wallet"}</span>
                <span className="xs:hidden sm:hidden">{handshake.state === "pending" ? "…" : "Connect"}</span>
              </Button>
              {!isMobileDevice && installedWallets.length > 0 && handshake.state === "idle" && (
                <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-muted-foreground max-w-[180px] truncate"><Monitor className="w-3 h-3" /> {installedWallets.join(", ")}</span>
              )}
              {handshake.state === "error" && (
                <button
                  type="button"
                  onClick={() => { try { resetConnect(); } catch (_) {} setHandshake({ state: "idle" }); openConnectModal(); }}
                  title={handshake.message}
                  className="hidden md:inline-flex items-center gap-1 text-[11px] text-destructive max-w-[220px] truncate"
                >
                  <AlertTriangle className="w-3 h-3" /> Retry — {handshake.message}
                </button>
              )}
              {handshake.state === "pending" && (
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground">{isMobileDevice && <Smartphone className="w-3 h-3" />} Confirm in your wallet…</span>
              )}
            </div>
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
