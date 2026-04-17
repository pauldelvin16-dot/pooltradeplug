import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * PoolChatRoom — visible to all users.
 * Shows a chat for the user's first FULL pool they joined.
 * If they're not in any full pool, shows an inviting empty state.
 */
const PoolChatRoom = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Find a full, active pool the user has joined
  const { data: activeChatPool } = useQuery({
    queryKey: ["my-active-chat-pool", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data: parts } = await supabase
        .from("pool_participants").select("pool_id").eq("user_id", user.id);
      if (!parts || parts.length === 0) return null;
      const ids = parts.map((p: any) => p.pool_id);
      const { data: pools } = await supabase
        .from("pools").select("*").in("id", ids).eq("status", "active");
      if (!pools) return null;
      // Pool is "chat-eligible" when it's full
      const eligible = pools.find((p: any) => p.current_participants >= p.max_participants);
      return eligible || null;
    },
    enabled: !!user,
  });

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
        <div className="text-center py-8 px-4 rounded-lg bg-secondary/20 border border-dashed border-border">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/60" />
          <p className="text-sm font-medium mb-1">No active pool chat</p>
          <p className="text-xs text-muted-foreground">
            Join a trading pool — when it fills up, you'll get instant access to the live chat with fellow traders.
          </p>
        </div>
      ) : (
        <>
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
