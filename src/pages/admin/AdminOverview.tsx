import { Users, Wallet, BarChart3, Trophy, TrendingUp, Activity } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminOverview = () => {
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data || [];
    },
  });

  const { data: allDeposits = [] } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*");
      return data || [];
    },
  });

  const { data: allWithdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*");
      return data || [];
    },
  });

  const { data: allMt5 = [] } = useQuery({
    queryKey: ["admin-mt5"],
    queryFn: async () => {
      const { data } = await supabase.from("mt5_accounts").select("*");
      return data || [];
    },
  });

  const { data: allPools = [] } = useQuery({
    queryKey: ["admin-pools"],
    queryFn: async () => {
      const { data } = await supabase.from("pools").select("*");
      return data || [];
    },
  });

  const pendingDeposits = allDeposits.filter((d: any) => d.status === "pending");
  const pendingWithdrawals = allWithdrawals.filter((w: any) => w.status === "pending");
  const totalBalance = allProfiles.reduce((s: number, p: any) => s + parseFloat(p.balance || 0), 0);
  const totalDeposited = allDeposits.filter((d: any) => d.status === "confirmed").reduce((s: number, d: any) => s + parseFloat(d.amount), 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-display font-bold">Dashboard Overview</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Users" value={String(allProfiles.length)} change="Registered" changeType="neutral" />
        <StatCard icon={Wallet} title="Pending Deposits" value={String(pendingDeposits.length)} change="Awaiting review" changeType={pendingDeposits.length > 0 ? "negative" : "neutral"} />
        <StatCard icon={BarChart3} title="MT5 Accounts" value={String(allMt5.length)} change={`${allMt5.filter((a: any) => a.status === "active").length} active`} changeType="neutral" />
        <StatCard icon={Trophy} title="Active Pools" value={String(allPools.filter((p: any) => p.status === "active").length)} change={`${allPools.length} total`} changeType="neutral" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={TrendingUp} title="Total Deposited" value={`$${totalDeposited.toLocaleString()}`} change="All confirmed" changeType="positive" />
        <StatCard icon={Activity} title="Total User Balance" value={`$${totalBalance.toLocaleString()}`} change="Across all users" changeType="neutral" />
        <StatCard icon={Wallet} title="Pending Withdrawals" value={String(pendingWithdrawals.length)} change="Awaiting review" changeType={pendingWithdrawals.length > 0 ? "negative" : "neutral"} />
      </div>
    </div>
  );
};

export default AdminOverview;
