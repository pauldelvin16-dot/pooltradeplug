import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import StatCard from "@/components/StatCard";

const AnalyticsPage = () => {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your trading performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="Total Invested" value="$18,500" change="Across 3 pools" changeType="neutral" />
        <StatCard icon={TrendingUp} title="Realized P&L" value="+$3,240" change="+17.5% ROI" changeType="positive" />
        <StatCard icon={TrendingDown} title="Unrealized P&L" value="+$890" change="2 open positions" changeType="positive" />
        <StatCard icon={Activity} title="Win Rate" value="72%" change="Last 30 days" changeType="positive" />
      </div>

      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Profit & Loss Over Time</h3>
        <div className="h-72 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
          <div className="text-center">
            <Activity className="w-10 h-10 mx-auto mb-2 text-primary/50" />
            <p>Analytics charts will render with live data</p>
            <p className="text-xs mt-1">Connect backend for real-time tracking</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
