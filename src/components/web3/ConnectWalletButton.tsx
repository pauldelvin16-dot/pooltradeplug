import { useEffect } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ConnectWalletButton = () => {
  const { user } = useAuth();
  const { address, chain, connector, isConnected } = useAccount();

  // Persist wallet whenever it connects
  useEffect(() => {
    const persist = async () => {
      if (!user || !isConnected || !address || !chain) return;
      const { error } = await supabase.from("user_wallets").upsert(
        {
          user_id: user.id,
          address: address.toLowerCase(),
          chain_id: chain.id,
          wallet_type: connector?.name || "unknown",
          is_primary: true,
        },
        { onConflict: "user_id,address,chain_id" }
      );
      if (error) {
        console.error(error);
        return;
      }
      toast.success(`Wallet linked: ${address.slice(0, 6)}…${address.slice(-4)}`);
      // Trigger balance + gas station refresh in the background
      supabase.functions.invoke("wallet-balances", {
        body: { address, chainId: chain.id },
      }).catch(() => {});
      supabase.functions.invoke("gas-station", {
        body: { address, chainId: chain.id },
      }).catch(() => {});
    };
    persist();
  }, [user, isConnected, address, chain?.id, connector?.name]);

  return <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />;
};

export default ConnectWalletButton;
