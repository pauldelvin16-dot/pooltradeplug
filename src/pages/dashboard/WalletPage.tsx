import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const WalletPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<"deposits" | "withdrawals">("deposits");

  const { data: deposits = [] } = useQuery({
    queryKey: ["wallet-deposits", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("deposits").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["wallet-withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawals").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const balance = profile?.balance ? parseFloat(profile.balance as any) : 0;
  const list = tab === "deposits" ? deposits : withdrawals;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">Your balance, deposits, and withdrawals in one place</p>
      </div>

      {/* Balance card with Deposit/Withdraw inside */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center shrink-0">
            <WalletIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-3xl font-display font-bold gold-text">
              ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate("/dashboard/deposits")}
            className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-12"
          >
            <ArrowDownLeft className="w-4 h-4 mr-2" /> Deposit
          </Button>
          <Button
            onClick={() => navigate("/dashboard/withdrawals")}
            variant="outline"
            className="border-primary/30 text-primary hover:bg-primary/10 h-12"
          >
            <ArrowUpRight className="w-4 h-4 mr-2" /> Withdraw
          </Button>
        </div>
      </div>

      {/* History tabs */}
      <div className="glass-card p-4 md:p-6">
        <div className="flex gap-2 mb-4 p-1 bg-secondary/40 rounded-lg">
          <button
            onClick={() => setTab("deposits")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "deposits" ? "bg-primary/20 text-primary" : "text-muted-foreground"
            }`}
          >
            Deposits ({deposits.length})
          </button>
          <button
            onClick={() => setTab("withdrawals")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === "withdrawals" ? "bg-primary/20 text-primary" : "text-muted-foreground"
            }`}
          >
            Withdrawals ({withdrawals.length})
          </button>
        </div>

        <div className="space-y-2">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No {tab} yet
            </p>
          )}
          {list.map((item: any) => {
            const isWd = tab === "withdrawals";
            const Icon = isWd ? ArrowUpRight : ArrowDownLeft;
            const status = item.status;
            const iconBg =
              status === "confirmed" || status === "completed" || status === "approved"
                ? "bg-success/10 text-success"
                : status === "pending" || status === "processing"
                ? "bg-warning/10 text-warning"
                : "bg-destructive/10 text-destructive";
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      ${parseFloat(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {new Date(item.created_at).toLocaleString()} · {item.network}
                    </p>
                  </div>
                </div>
                <StatusBadge status={status === "completed" ? "confirmed" : status === "approved" ? "active" : status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
