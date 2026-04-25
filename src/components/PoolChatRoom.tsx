import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Users, Lock, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * PoolChatRoom — visible to all users.
 * - In a full active pool: live chat enabled
 * - In a non-full pool: locked state ("waiting for pool to fill")
 * - Not in any pool: invite to browse pools
 */
const PoolChatRoom = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Find pools the user has joined
  const { data: joinedPools = [] } = useQuery({
    queryKey: ["my-joined-pools", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: parts } = await supabase
        .from("pool_participants").select("pool_id").eq("user_id", user.id);
      if (!parts || parts.length === 0) return [];
      const ids = parts.map((p: any) => p.pool_id);
      const { data: pools } = await supabase
        .from("pools").select("*").in("id", ids).eq("status", "active");
      return pools || [];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // Eligible pools (full) — chat unlocked
  const eligiblePools = joinedPools.filter((p: any) => p.current_participants >= p.max_participants);
  // Waiting pools (not yet full) — sorted by closest to filling
  const waitingPools = joinedPools
    .filter((p: any) => p.current_participants < p.max_participants)
    .sort((a: any, b: any) => (b.current_participants / b.max_participants) - (a.current_participants / a.max_participants));

  // Allow user to pick which eligible pool to chat in (default: first)
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const activeChatPool =
    eligiblePools.find((p: any) => p.id === selectedPoolId) || eligiblePools[0] || null;
  const closestWaitingPool = !activeChatPool ? waitingPools[0] || null : null;

  const poolId = activeChatPool?.id;

  const { data: messages = [] } = useQuery({
    queryKey: ["pool-chat-room", poolId],
    queryFn: async () => {
      if (!poolId) return [];
      const { data } = await supabase
        .from("pool_chat_messages").select("*")
        .eq("pool_id", poolId)
        .order("created_at", { ascending: true })
        .limit(100);
      return data || [];
    },
    enabled: !!poolId,
  });

  useEffect(() => {
    if (!poolId) return;
    const ch = supabase
      .channel(`chatroom-${poolId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "pool_chat_messages", filter: `pool_id=eq.${poolId}` },
        () => queryClient.invalidateQueries({ queryKey: ["pool-chat-room", poolId] })
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [poolId, queryClient]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useMutation({
    mutationFn: async () => {
      if (!poolId || !message.trim()) return;
      const { error } = await supabase.from("pool_chat_messages").insert({
        pool_id: poolId, user_id: user!.id, message: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => setMessage(""),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass-card p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm md:text-base truncate">
            {activeChatPool ? `Pool Chat — ${activeChatPool.name}` : "Pool Chat Room"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {activeChatPool
              ? `${activeChatPool.current_participants}/${activeChatPool.max_participants} traders online`
              : "Join a full pool to start chatting"}
          </p>
        </div>
      </div>

      {!activeChatPool ? (
        <div className="py-6 px-4 rounded-lg bg-secondary/20 border border-dashed border-border">
          {closestWaitingPool ? (
            <div className="space-y-4">
              <div className="text-center">
                <Lock className="w-10 h-10 mx-auto mb-3 text-primary/60" />
                <p className="text-sm font-medium mb-1">Chat unlocks when your pool fills</p>
                <p className="text-xs text-muted-foreground">
                  Almost there — keep an eye on your pools below
                </p>
              </div>

              {waitingPools.map((p: any) => {
                const pct = Math.min(100, (p.current_participants / p.max_participants) * 100);
                const remaining = Math.max(0, p.max_participants - p.current_participants);
                return (
                  <div key={p.id} className="rounded-lg bg-card/60 border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">{p.name}</span>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {remaining} {remaining === 1 ? "slot" : "slots"} left
                      </Badge>
                    </div>
                    <Progress value={pct} className="h-2" />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{p.current_participants}/{p.max_participants} traders joined</span>
                      <span>{Math.round(pct)}%</span>
                    </div>
                  </div>
                );
              })}

              <div className="text-center">
                <Button size="sm" variant="outline" onClick={() => navigate("/dashboard/pools")}>
                  View pools
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
              <p className="text-sm font-medium mb-1">Join a pool to unlock chat</p>
              <p className="text-xs text-muted-foreground mb-3">
                When your pool fills up, you get instant access to the live chat with fellow traders.
              </p>
              <Button size="sm" className="gold-gradient text-primary-foreground hover:opacity-90" onClick={() => navigate("/dashboard/pools")}>
                Browse pools
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Pool selector when user is eligible in multiple pools */}
          {eligiblePools.length > 1 && (
            <div className="mb-3 p-2 rounded-lg bg-secondary/30 border border-border">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 px-1">
                You have chat access in {eligiblePools.length} pools — pick one
              </p>
              <div className="flex flex-wrap gap-1.5">
                {eligiblePools.map((p: any) => {
                  const isActive = p.id === activeChatPool.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPoolId(p.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors ${
                        isActive
                          ? "bg-primary/20 text-foreground border border-primary/40"
                          : "bg-card/60 text-muted-foreground border border-border hover:text-foreground"
                      }`}
                    >
                      {isActive ? <CheckCircle2 className="w-3 h-3 text-primary" /> : <Circle className="w-3 h-3" />}
                      <span className="truncate max-w-[120px]">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="h-56 md:h-64 overflow-y-auto space-y-2 mb-3 p-3 rounded-lg bg-secondary/30 border border-border">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No messages yet — say hi 👋</p>
            ) : (
              messages.map((m: any) => (
                <div key={m.id} className={`flex flex-col ${m.user_id === user?.id ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm break-words ${
                    m.user_id === user?.id ? "bg-primary/20 text-foreground" : "bg-secondary/60"
                  }`}>{m.message}</div>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message…"
              onKeyDown={(e) => e.key === "Enter" && send.mutate()}
              className="bg-secondary/50 border-border"
            />
            <Button size="icon" disabled={!message.trim() || send.isPending} onClick={() => send.mutate()}
              className="gold-gradient text-primary-foreground hover:opacity-90 shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default PoolChatRoom;
