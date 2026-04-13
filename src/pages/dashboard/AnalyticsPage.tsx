import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";

const AnalyticsPage = () => {
  const { user } = useAuth();
  const [cryptoData, setCryptoData] = useState<any[]>([]);
  const [forexData, setForexData] = useState<any[]>([]);

  const { data: deposits = [] } = useQuery({
    queryKey: ["analytics-deposits", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*").eq("status", "confirmed").order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["analytics-withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*").eq("status", "completed").order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    // CoinGecko: ETH 30 days
    fetch("https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=30&interval=daily")
      .then(r => r.json())
      .then(d => {
        if (d.prices) {
          setCryptoData(d.prices.map(([ts, price]: [number, number]) => ({
            date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            ETH: Math.round(price),
          })));
        }
      }).catch(() => {});

    // CoinGecko: gold as commodity proxy
    fetch("https://api.coingecko.com/api/v3/coins/tether-gold/market_chart?vs_currency=usd&days=30&interval=daily")
      .then(r => r.json())
      .then(d => {
        if (d.prices) {
          setForexData(d.prices.map(([ts, price]: [number, number]) => ({
            date: new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            XAUT: Math.round(price),
          })));
        }
      }).catch(() => {});
  }, []);

  const totalDeposited = deposits.reduce((s: number, d: any) => s + parseFloat(d.amount), 0);
  const totalWithdrawn = withdrawals.reduce((s: number, w: any) => s + parseFloat(w.amount), 0);
  const netPL = totalDeposited - totalWithdrawn;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your trading performance & markets</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} title="Total Deposited" value={`$${totalDeposited.toLocaleString()}`} change={`${deposits.length} deposits`} changeType="neutral" />
        <StatCard icon={TrendingUp} title="Total Withdrawn" value={`$${totalWithdrawn.toLocaleString()}`} change={`${withdrawals.length} withdrawals`} changeType="neutral" />
        <StatCard icon={TrendingDown} title="Net P&L" value={`$${netPL.toLocaleString()}`} change={netPL >= 0 ? "Profit" : "Loss"} changeType={netPL >= 0 ? "positive" : "negative"} />
        <StatCard icon={Activity} title="Transactions" value={String(deposits.length + withdrawals.length)} change="All time" changeType="neutral" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">ETH/USD — 30 Day Chart</h3>
          {cryptoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={cryptoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="ETH" stroke="hsl(217, 91%, 60%)" fill="hsla(217, 91%, 60%, 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">XAUT (Gold Token) — 30 Day</h3>
          {forexData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={forexData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="XAUT" stroke="hsl(43, 96%, 56%)" fill="hsla(43, 96%, 56%, 0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-72 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
