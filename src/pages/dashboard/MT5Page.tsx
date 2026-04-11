import { BarChart3, AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";

const mt5Accounts = [
  { id: "MT5-4821", status: "assigned" as const, maxAlloc: 10000, currentUsage: 6500, server: "TradeLux-Live1" },
  { id: "MT5-7392", status: "available" as const, maxAlloc: 25000, currentUsage: 0, server: "TradeLux-Live2" },
  { id: "MT5-1058", status: "disabled" as const, maxAlloc: 5000, currentUsage: 0, server: "TradeLux-Live1" },
  { id: "MT5-9104", status: "assigned" as const, maxAlloc: 15000, currentUsage: 14200, server: "TradeLux-Live3" },
];

const MT5Page = () => {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">MT5 Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your MetaTrader 5 trading accounts</p>
      </div>

      <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>MT5 account management may have limited availability. Disabled accounts cannot be used until re-enabled by admin.</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mt5Accounts.map((acc) => {
          const usagePercent = acc.maxAlloc > 0 ? (acc.currentUsage / acc.maxAlloc) * 100 : 0;
          const isNearLimit = usagePercent > 80;

          return (
            <div key={acc.id} className={`glass-card-hover p-5 ${acc.status === "disabled" ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-semibold">{acc.id}</p>
                    <p className="text-xs text-muted-foreground">{acc.server}</p>
                  </div>
                </div>
                <StatusBadge status={acc.status} />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max Allocation</span>
                  <span className="font-medium">${acc.maxAlloc.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Usage</span>
                  <span className={`font-medium ${isNearLimit ? "text-warning" : ""}`}>
                    ${acc.currentUsage.toLocaleString()}
                  </span>
                </div>
                <div>
                  <Progress value={usagePercent} className="h-2 bg-secondary" />
                  <p className="text-xs text-muted-foreground mt-1">{usagePercent.toFixed(0)}% utilized</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MT5Page;
