import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Smartphone, Monitor, Wifi, WifiOff } from "lucide-react";
import { CHAIN_META } from "@/lib/web3/config";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 min

const WalletStatusPanel = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(i);
  }, []);

  const { data: rows = [] } = useQuery({
    queryKey: ["wallet-status", tick],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_wallets")
        .select("id,address,chain_id,wallet_type,last_synced_at,user_id,is_primary")
        .order("last_synced_at", { ascending: false })
        .limit(20);
      const ids = Array.from(new Set((data || []).map((r: any) => r.user_id)));
      const map: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", ids);
        (profs || []).forEach((p: any) => (map[p.user_id] = p));
      }
      return (data || []).map((r: any) => ({ ...r, profile: map[r.user_id] }));
    },
    refetchInterval: 15000,
  });

  // Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("admin-wallets-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_wallets" }, () => setTick((t) => t + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const now = Date.now();
  const online = rows.filter((r: any) => r.last_synced_at && now - new Date(r.last_synced_at).getTime() < ONLINE_THRESHOLD_MS);

  return (
    <Card className="p-4 bg-secondary/30">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Realtime Wallet Connections
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-success/40 text-success">{online.length} online</Badge>
          <Badge variant="outline">{rows.length} total</Badge>
        </div>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-auto">
        {rows.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No wallet connections yet.</p>}
        {rows.map((r: any) => {
          const isOnline = r.last_synced_at && now - new Date(r.last_synced_at).getTime() < ONLINE_THRESHOLD_MS;
          const meta = CHAIN_META[r.chain_id];
          const isMobile = /iOS|Android|Mobile/i.test(r.wallet_type || "");
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 p-2 rounded bg-background/40 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-success shrink-0" /> : <WifiOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                {isMobile ? <Smartphone className="w-3 h-3 text-muted-foreground shrink-0" /> : <Monitor className="w-3 h-3 text-muted-foreground shrink-0" />}
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.profile?.email || "—"}</p>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">{r.address}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px]">{meta?.logo} {meta?.name}</p>
                <p className="text-[10px] text-muted-foreground">{r.wallet_type || "unknown"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {r.last_synced_at ? new Date(r.last_synced_at).toLocaleTimeString() : "never"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WalletStatusPanel;
