import { Users, Target, Clock, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["hsl(43, 96%, 56%)", "hsl(142, 76%, 36%)", "hsl(217, 91%, 60%)", "hsl(0, 84%, 60%)"];

const PoolsPage = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useAdminSettings();

  const { data: pools = [] } = useQuery({
    queryKey: ["pools"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pools").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ["my-participations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pool_participants").select("pool_id").eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const joinedPoolIds = new Set(myParticipations.map((p: any) => p.pool_id));

  const joinPool = useMutation({
    mutationFn: async (pool: any) => {
      const balance = parseFloat(profile?.balance || "0");
      if (balance < parseFloat(pool.entry_amount)) {
        throw new Error(`Insufficient balance. You need $${parseFloat(pool.entry_amount).toLocaleString()} to join.`);
      }
      const { error } = await supabase.from("pool_participants").insert({
        pool_id: pool.id,
        user_id: user!.id,
        amount_invested: parseFloat(pool.entry_amount),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Successfully joined pool!");
      queryClient.invalidateQueries({ queryKey: ["my-participations"] });
      queryClient.invalidateQueries({ queryKey: ["pools"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Pool progress pie data
  const poolPieData = pools
    .filter((p: any) => p.status === "active")
    .slice(0, 4)
    .map((p: any) => ({
      name: p.name,
      value: parseFloat(p.current_profit),
      target: parseFloat(p.target_profit),
    }));

  if (!settings?.pools_enabled) {
    return (
      <div className="p-4 md:p-8">
        <div className="glass-card p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Pool Trading Temporarily Unavailable</h2>
          <p className="text-muted-foreground">The admin has temporarily disabled pool trading. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Pool Trading</h1>
          <p className="text-sm text-muted-foreground mt-1">Join exclusive trading pools for shared profits</p>
        </div>
      </div>

      {/* Pool Progress Visualization */}
      {poolPieData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Active Pool Progress</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={poolPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {poolPieData.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Profit"]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {poolPieData.map((p: any, i: number) => (
                <div key={p.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground flex-1">{p.name}</span>
                  <span className="font-medium">${p.value.toLocaleString()} / ${p.target.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {pools.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No Pools Available</h3>
          <p className="text-sm text-muted-foreground">Check back later for new trading pools.</p>
        </div>
      )}

      <div className="grid gap-6">
        {pools.map((pool: any) => {
          const profitPercent = (parseFloat(pool.current_profit) / parseFloat(pool.target_profit)) * 100;
          const isFull = pool.current_participants >= pool.max_participants;
          const hasJoined = joinedPoolIds.has(pool.id);
          const daysLeft = pool.end_date ? Math.max(0, Math.ceil((new Date(pool.end_date).getTime() - Date.now()) / 86400000)) : pool.duration_days;

          return (
            <div key={pool.id} className="glass-card-hover p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{pool.name}</h3>
                    {pool.description && <p className="text-xs text-muted-foreground">{pool.description}</p>}
                  </div>
                </div>
                <StatusBadge status={pool.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Target</p>
                  <p className="font-semibold">${parseFloat(pool.target_profit).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Participants</p>
                  <p className="font-semibold">{pool.current_participants}/{pool.max_participants}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Entry Amount</p>
                  <p className="font-semibold">${parseFloat(pool.entry_amount).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Time Left</p>
                  <p className="font-semibold">{daysLeft > 0 ? `${daysLeft} days` : "Completed"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profit Progress</span>
                  <span className={`font-medium ${profitPercent >= 100 ? "text-success" : "text-primary"}`}>
                    ${parseFloat(pool.current_profit).toLocaleString()} / ${parseFloat(pool.target_profit).toLocaleString()}
                  </span>
                </div>
                <Progress value={Math.min(profitPercent, 100)} className="h-3 bg-secondary" />
              </div>

              {pool.status === "active" && !isFull && !hasJoined && (
                <Button
                  className="mt-4 gold-gradient text-primary-foreground font-semibold hover:opacity-90"
                  disabled={joinPool.isPending}
                  onClick={() => joinPool.mutate(pool)}
                >
                  {joinPool.isPending ? "Joining..." : "Join Pool"} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {hasJoined && (
                <p className="mt-4 text-sm text-success font-medium">✓ You've joined this pool</p>
              )}
              {isFull && !hasJoined && pool.status === "active" && (
                <p className="mt-4 text-sm text-muted-foreground">Pool is full — check back for new pools</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PoolsPage;
