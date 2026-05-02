import ConnectWalletButton from "@/components/web3/ConnectWalletButton";
import { useAuth } from "@/hooks/useAuth";
import { Wallet } from "lucide-react";

const DashboardTopBar = () => {
  const { profile } = useAuth();
  const balance = profile?.balance ? parseFloat(profile.balance as any) : 0;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 px-3 md:px-6 h-14 border-b border-border bg-card/90 backdrop-blur-xl">
      <div className="flex items-center gap-2 min-w-0">
        <div className="md:hidden w-8 h-8 rounded-lg gold-gradient flex items-center justify-center shrink-0">
          <Wallet className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Balance</p>
          <p className="text-sm md:text-base font-bold gold-text truncate leading-tight">
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
      <div className="shrink-0">
        <ConnectWalletButton />
      </div>
    </header>
  );
};

export default DashboardTopBar;
