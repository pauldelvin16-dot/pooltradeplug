import { DollarSign, TrendingUp, BarChart3, Users, ArrowUpRight, ArrowDownRight, Bell } from "lucide-react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";

const recentActivity = [
  { action: "Deposit confirmed", amount: "+$5,000", time: "2 min ago", type: "positive" as const },
  { action: "Pool #23 joined", amount: "-$1,000", time: "1 hr ago", type: "negative" as const },
  { action: "MT5-4821 assigned", amount: "", time: "3 hr ago", type: "neutral" as const },
  { action: "Profit distributed", amount: "+$340", time: "1 day ago", type: "positive" as const },
];

const DashboardHome = () => {
  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Welcome back, <span className="gold-text">Trader</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your portfolio overview</p>
        </div>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="Total Balance" value="$24,580.00" change="+12.5% this month" changeType="positive" />
        <StatCard icon={TrendingUp} title="Total Profit" value="$3,240.50" change="+8.2% this week" changeType="positive" />
        <StatCard icon={BarChart3} title="Active MT5" value="3" change="2 available" changeType="neutral" />
        <StatCard icon={Users} title="Active Pools" value="2" change="1 completing soon" changeType="neutral" />
      </div>

      {/* Portfolio Chart Placeholder + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-semibold mb-4">Portfolio Performance</h3>
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg">
            <div className="text-center">
              <BarChart3 className="w-10 h-10 mx-auto mb-2 text-primary/50" />
              <p>Interactive chart will appear here</p>
              <p className="text-xs mt-1">Connect backend to see live data</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.type === "positive" ? "bg-success/10" : item.type === "negative" ? "bg-destructive/10" : "bg-secondary"
                  }`}>
                    {item.type === "positive" ? <ArrowUpRight className="w-4 h-4 text-success" /> :
                     item.type === "negative" ? <ArrowDownRight className="w-4 h-4 text-destructive" /> :
                     <BarChart3 className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="text-sm">{item.action}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
                {item.amount && (
                  <span className={`text-sm font-medium ${item.type === "positive" ? "text-success" : "text-destructive"}`}>
                    {item.amount}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick MT5 Status */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">MT5 Accounts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border">
                <th className="text-left py-3 font-medium">Account ID</th>
                <th className="text-left py-3 font-medium">Status</th>
                <th className="text-left py-3 font-medium">Max Allocation</th>
                <th className="text-left py-3 font-medium">Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { id: "MT5-4821", status: "assigned" as const, max: "$10,000", usage: "65%" },
                { id: "MT5-7392", status: "available" as const, max: "$25,000", usage: "0%" },
                { id: "MT5-1058", status: "disabled" as const, max: "$5,000", usage: "—" },
              ].map((acc) => (
                <tr key={acc.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 font-mono text-xs">{acc.id}</td>
                  <td className="py-3"><StatusBadge status={acc.status} /></td>
                  <td className="py-3">{acc.max}</td>
                  <td className="py-3">{acc.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
