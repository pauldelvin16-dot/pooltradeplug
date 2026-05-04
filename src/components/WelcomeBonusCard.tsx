import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const WelcomeBonusCard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const { data: settings } = useQuery({
    queryKey: ["welcome-bonus-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings")
        .select("welcome_bonus_enabled, welcome_bonus_amount, welcome_bonus_min_deposit, welcome_bonus_window_hours")
        .limit(1).maybeSingle();
      return data;
    },
  });

  const { data: claim, refetch } = useQuery({
    queryKey: ["welcome-bonus-claim", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Reset cycle if expired
      await supabase.rpc("reset_welcome_bonus_cycle");
      const { data } = await supabase.from("welcome_bonus_claims")
        .select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    refetchInterval: 60_000,
  });

  const { data: deposits = 0 } = useQuery({
    queryKey: ["welcome-deposits-total", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("deposits")
        .select("amount").eq("user_id", user!.id).eq("status", "confirmed");
      return (data || []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
    },
  });

  if (!settings?.welcome_bonus_enabled || !user) return null;

  const minDeposit = Number(settings.welcome_bonus_min_deposit || 0);
  const amount = Number(settings.welcome_bonus_amount || 0);
  const windowHrs = Number(settings.welcome_bonus_window_hours || 24);
  const eligible = deposits >= minDeposit;
  const claimed = !!claim?.claimed;
  const cycleStart = claim?.cycle_started_at ? new Date(claim.cycle_started_at).getTime() : Date.now();
  const cycleEnd = cycleStart + windowHrs * 3600_000;
  const msLeft = Math.max(0, cycleEnd - now);
  const hh = Math.floor(msLeft / 3600_000);
  const mm = Math.floor((msLeft % 3600_000) / 60_000);
  const ss = Math.floor((msLeft % 60_000) / 1000);
  const progress = Math.min(100, (deposits / Math.max(1, minDeposit)) * 100);

  const claimNow = async () => {
    const { data, error } = await supabase.rpc("claim_welcome_bonus");
    if (error) return toast.error(error.message);
    if ((data as any)?.ok) {
      toast.success(`🎉 ${amount} USDT credited to your balance!`);
      refetch();
      qc.invalidateQueries({ queryKey: ["profile"] });
    } else {
      toast.error((data as any)?.error || "Cannot claim right now");
    }
  };

  return (
    <Card className="glass-card p-5 relative overflow-hidden border-primary/30">
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-start gap-4 relative">
        <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center shrink-0">
          <Gift className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-lg gold-text">Welcome Bonus</h3>
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Deposit ${minDeposit}+ and claim <span className="text-primary font-semibold">${amount} USDT</span> free.
          </p>

          <div className="mt-3 h-2 bg-secondary/40 rounded-full overflow-hidden">
            <div className="h-full gold-gradient transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ${deposits.toFixed(2)} / ${minDeposit} deposited
          </p>

          {claimed ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-500">
              <CheckCircle2 className="w-4 h-4" /> Bonus claimed — ${Number(claim.amount).toFixed(2)} credited
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <Button size="sm" onClick={claimNow} disabled={!eligible} className="gold-gradient text-primary-foreground font-semibold">
                {eligible ? "Claim now" : "Deposit to unlock"}
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Clock className="w-3 h-3 text-primary" />
                {String(hh).padStart(2,"0")}:{String(mm).padStart(2,"0")}:{String(ss).padStart(2,"0")} until reset
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default WelcomeBonusCard;
