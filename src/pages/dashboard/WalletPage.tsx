import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, History, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

const WalletPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation();
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
    <div className="p-4 md:p-8 space-y-5 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">{t("wallet.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("wallet.subtitle")}</p>
      </div>

      {/* HERO Balance card with embedded actions */}
      <div className="relative overflow-hidden glass-card p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(43,96%,56%,0.15),transparent_60%)] pointer-events-none" />
        <div className="relative space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl gold-gradient flex items-center justify-center shrink-0 shadow-gold-glow">
                <WalletIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("wallet.available")}
                </p>
                <p className="text-3xl md:text-4xl font-display font-bold gold-text leading-tight">
                  ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-primary/60 shrink-0" />
          </div>

          {/* Identical-height symmetric action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => navigate("/dashboard/deposits")}
              className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-14 text-base flex-col gap-0.5 shadow-gold-glow"
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span>{t("wallet.deposit")}</span>
            </Button>
            <Button
              onClick={() => navigate("/dashboard/withdrawals")}
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 h-14 text-base font-semibold flex-col gap-0.5"
            >
              <ArrowUpRight className="w-5 h-5" />
              <span>{t("wallet.withdraw")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="glass-card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Transaction History</h3>
        </div>
        <div className="flex gap-1 mb-4 p-1 bg-secondary/40 rounded-lg">
          <button
            onClick={() => setTab("deposits")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              tab === "deposits"
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("wallet.deposits")} ({deposits.length})
          </button>
          <button
            onClick={() => setTab("withdrawals")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
              tab === "withdrawals"
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("wallet.withdrawals")} ({withdrawals.length})
          </button>
        </div>

        <div className="space-y-2">
          {list.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("wallet.noHistory", { type: t(`wallet.${tab}`) })}
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
