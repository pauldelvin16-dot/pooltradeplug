import { DollarSign, TrendingUp, BarChart3, Users, ArrowUpRight, ArrowDownRight, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";
import PoolChatRoom from "@/components/PoolChatRoom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useEffect, useState } from "react";

const DashboardHome = () => {
  const { user, profile } = useAuth();
  const [marketData, setMarketData] = useState<any[]>([]);

  const { data: deposits = [] } = useQuery({
    queryKey: ["my-deposits", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: mt5Accounts = [] } = useQuery({
    queryKey: ["my-mt5", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("mt5_accounts").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: poolParticipations = [] } = useQuery({
    queryKey: ["my-pools", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("pool_participants").select("*, pools(*)");
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch CoinGecko market data for chart
  useEffect(() => {
    fetch("https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=daily")
      .then((r) => r.json())
      .then((d) => {
        if (d.prices) {
          setMarketData(
            d.prices.map(([ts, price]: [number, number]) => ({
              date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              BTC: Math.round(price),
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const confirmedDeposits = deposits.filter((d: any) => d.status === "confirmed");
  const totalDeposited = confirmedDeposits.reduce((sum: number, d: any) => sum + parseFloat(d.amount), 0);

  // Build deposit chart data
  const depositChartData = deposits
    .filter((d: any) => d.status === "confirmed")
    .slice(0, 7)
    .reverse()
    .map((d: any) => ({
      date: new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: parseFloat(d.amount),
    }));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Welcome back, <span className="gold-text">{profile?.first_name || "Trader"}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your portfolio overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="Balance" value={`$${parseFloat(profile?.balance || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}`} change="Available funds" changeType="neutral" />
        <StatCard icon={TrendingUp} title="Total Deposited" value={`$${totalDeposited.toLocaleString()}`} change={`${confirmedDeposits.length} deposits`} changeType="positive" />
        <StatCard icon={BarChart3} title="MT5 Accounts" value={String(mt5Accounts.length)} change={`${mt5Accounts.filter((a: any) => a.status === "active").length} active`} changeType="neutral" />
        <StatCard icon={Users} title="Active Pools" value={String(poolParticipations.length)} change="Joined pools" changeType="neutral" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* BTC Market Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="font-semibold mb-4">BTC/USD — 7 Day Chart</h3>
          {marketData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={marketData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "BTC"]}
                />
                <Line type="monotone" dataKey="BTC" stroke="hsl(43, 96%, 56%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading market data...</div>
          )}
        </div>

        {/* Deposit History Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Recent Deposits</h3>
          {depositChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={depositChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="amount" fill="hsl(43, 96%, 56%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              <p className="text-center text-xs">No confirmed deposits yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Pool Chat Room — visible to everyone */}
      <PoolChatRoom />
    </div>
  );
};

export default DashboardHome;
