import { useState, useEffect, useRef } from "react";
import { Users, Target, Clock, Trophy, ArrowRight, MessageSquare, Send, TrendingUp, AlertTriangle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/StatusBadge";
import SimulatedPoolHistory from "@/components/SimulatedPoolHistory";
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
  const [selectedPoolChat, setSelectedPoolChat] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const { data: chatMessages = [] } = useQuery({
    queryKey: ["pool-chat", selectedPoolChat],
    queryFn: async () => {
      if (!selectedPoolChat) return [];
      const { data, error } = await supabase
        .from("pool_chat_messages")
        .select("*")
        .eq("pool_id", selectedPoolChat)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPoolChat,
  });

  useEffect(() => {
    if (!selectedPoolChat) return;
    const channel = supabase
      .channel(`pool-chat-${selectedPoolChat}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "pool_chat_messages",
        filter: `pool_id=eq.${selectedPoolChat}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["pool-chat", selectedPoolChat] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedPoolChat, queryClient]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const joinedPoolIds = new Set(myParticipations.map((p: any) => p.pool_id));

  const joinPool = useMutation({
    mutationFn: async (pool: any) => {
      const balance = parseFloat(profile?.balance || "0");
      if (balance < parseFloat(pool.entry_amount)) {
        throw new Error(`Insufficient balance. You need $${parseFloat(pool.entry_amount).toLocaleString()} to join. Your balance is $${balance.toLocaleString()}.`);
      }
      // Deduct balance
      const { error: balErr } = await supabase.from("profiles").update({
        balance: balance - parseFloat(pool.entry_amount),
      }).eq("user_id", user!.id);
      if (balErr) throw new Error("Failed to deduct balance");
      
      const { error } = await supabase.from("pool_participants").insert({
        pool_id: pool.id, user_id: user!.id, amount_invested: parseFloat(pool.entry_amount),
      });
      if (error) throw error;

      // Increment participant count
      await supabase.from("pools").update({
        current_participants: pool.current_participants + 1,
      }).eq("id", pool.id);
    },
    onSuccess: () => {
      toast.success("Successfully joined pool! Balance deducted.");
      queryClient.invalidateQueries({ queryKey: ["my-participations"] });
      queryClient.invalidateQueries({ queryKey: ["pools"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedPoolChat || !chatMessage.trim()) return;
      const { error } = await supabase.from("pool_chat_messages").insert({
        pool_id: selectedPoolChat, user_id: user!.id, message: chatMessage.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: ["pool-chat", selectedPoolChat] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const poolPieData = pools
    .filter((p: any) => p.status === "active")
    .slice(0, 4)
    .map((p: any) => ({ name: p.name, value: parseFloat(p.current_profit), target: parseFloat(p.target_profit) }));

  const s = settings as any;
  const bonusEnabled = s?.first_deposit_bonus_enabled;
  const bonusMin = s?.first_deposit_min_amount;
  const bonusAmount = s?.first_deposit_bonus_amount;

  if (!settings?.pools_enabled) {
    return (
      <div className="p-4 md:p-8">
        <div className="glass-card p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Pool Trading Temporarily Unavailable</h2>
          <p className="text-muted-foreground">The admin has temporarily disabled pool trading.</p>
        </div>
      </div>
    );
  }

  const selectedPool = pools.find((p: any) => p.id === selectedPoolChat);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Pool Trading</h1>
          <p className="text-sm text-muted-foreground mt-1">Join exclusive trading pools for shared profits</p>
        </div>
      </div>

      {/* First Deposit Bonus Banner */}
      {bonusEnabled && (
        <div className="glass-card p-4 border border-primary/20 bg-primary/5 flex items-center gap-3">
          <Gift className="w-8 h-8 text-primary shrink-0" />
          <div>
            <p className="text-sm font-semibold">🎉 First Deposit Bonus!</p>
            <p className="text-xs text-muted-foreground">Deposit ${bonusMin}+ and receive a <span className="text-primary font-bold">${bonusAmount} bonus</span> credited to your account!</p>
          </div>
        </div>
      )}

      {/* Pool Progress Visualization */}
      {poolPieData.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Active Pool Progress</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={poolPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {poolPieData.map((_: any, i: number) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Profit"]} />
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

      {/* Chat Panel */}
      {selectedPoolChat && selectedPool && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Pool Chat — {selectedPool.name}</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedPoolChat(null)} className="text-muted-foreground">Close</Button>
          </div>
          <div className="h-64 overflow-y-auto space-y-2 mb-4 p-3 rounded-lg bg-secondary/30 border border-border">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No messages yet. Be the first!</p>
            ) : (
              chatMessages.map((msg: any) => (
                <div key={msg.id} className={`flex flex-col ${msg.user_id === user?.id ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.user_id === user?.id ? "bg-primary/20 text-foreground" : "bg-secondary/50"}`}>
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{new Date(msg.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              className="bg-secondary/50 border-border"
              onKeyDown={(e) => e.key === "Enter" && sendMessage.mutate()}
            />
            <Button size="icon" onClick={() => sendMessage.mutate()} disabled={!chatMessage.trim()} className="gold-gradient text-primary-foreground hover:opacity-90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {pools.map((pool: any) => {
          const profitPercent = (parseFloat(pool.current_profit) / parseFloat(pool.target_profit)) * 100;
          const isFull = pool.current_participants >= pool.max_participants;
          const hasJoined = joinedPoolIds.has(pool.id);
          const daysLeft = pool.end_date ? Math.max(0, Math.ceil((new Date(pool.end_date).getTime() - Date.now()) / 86400000)) : pool.duration_days;
          const profitSplit = (pool as any).profit_split_percentage || 70;
          const tradedSymbol = (pool as any).traded_symbol;
          const refundPolicy = (pool as any).refund_policy;
          const chatEnabled = isFull && hasJoined;
          const userBalance = parseFloat(profile?.balance || "0");
          const entryAmount = parseFloat(pool.entry_amount);
          const canAfford = userBalance >= entryAmount;

          return (
            <div key={pool.id} className="glass-card-hover p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{pool.name}</h3>
                      {tradedSymbol && (
                        <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent-foreground font-mono font-bold">{tradedSymbol}</span>
                      )}
                    </div>
                    {pool.description && <p className="text-xs text-muted-foreground">{pool.description}</p>}
                  </div>
                </div>
                <StatusBadge status={pool.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
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
                  <p className="font-semibold">${entryAmount.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Time Left</p>
                  <p className="font-semibold">{daysLeft > 0 ? `${daysLeft} days` : "Completed"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Profit Split</p>
                  <p className="font-semibold text-primary">{profitSplit}% to you</p>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profit Progress</span>
                  <span className={`font-medium ${profitPercent >= 100 ? "text-success" : "text-primary"}`}>
                    ${parseFloat(pool.current_profit).toLocaleString()} / ${parseFloat(pool.target_profit).toLocaleString()}
                  </span>
                </div>
                <Progress value={Math.min(profitPercent, 100)} className="h-3 bg-secondary" />
              </div>

              {refundPolicy && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/5 border border-warning/10 mb-3">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">{refundPolicy}</p>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                {pool.status === "active" && !isFull && !hasJoined && (
                  <div className="flex items-center gap-2">
                    <Button
                      className="gold-gradient text-primary-foreground font-semibold hover:opacity-90"
                      disabled={joinPool.isPending || !canAfford}
                      onClick={() => joinPool.mutate(pool)}
                    >
                      {joinPool.isPending ? "Joining..." : canAfford ? "Join Pool" : "Insufficient Balance"} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    {!canAfford && (
                      <p className="text-xs text-destructive">Need ${(entryAmount - userBalance).toLocaleString()} more</p>
                    )}
                  </div>
                )}
                {hasJoined && <p className="text-sm text-success font-medium">✓ You've joined this pool</p>}
                {isFull && !hasJoined && pool.status === "active" && <p className="text-sm text-muted-foreground">Pool is full</p>}
                
                {chatEnabled && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedPoolChat(selectedPoolChat === pool.id ? null : pool.id)}
                    className="border-primary/20 text-primary hover:bg-primary/10"
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    {selectedPoolChat === pool.id ? "Close Chat" : "Pool Chat"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulated Past Performance & Reviews */}
      <SimulatedPoolHistory />
    </div>
  );
};

export default PoolsPage;
