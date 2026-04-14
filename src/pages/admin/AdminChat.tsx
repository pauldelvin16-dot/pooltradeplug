import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare } from "lucide-react";

const AdminChat = () => {
  const { data: pools = [] } = useQuery({
    queryKey: ["admin-pools-chat"],
    queryFn: async () => {
      const { data } = await supabase.from("pools").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ["admin-all-chat"],
    queryFn: async () => {
      const { data } = await supabase.from("pool_chat_messages").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const fullPools = pools.filter((p: any) => p.current_participants >= p.max_participants);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-display font-bold">Chat Rooms</h2>
      <p className="text-sm text-muted-foreground">Chat rooms are automatically created when a pool reaches maximum participants. Participants can then communicate before trading starts.</p>

      <div className="grid gap-4">
        {fullPools.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Active Chat Rooms</h3>
            <p className="text-sm text-muted-foreground">Chat rooms will appear when pools reach their participant limit.</p>
          </div>
        ) : (
          fullPools.map((pool: any) => {
            const poolChats = chatMessages.filter((m: any) => m.pool_id === pool.id);
            return (
              <div key={pool.id} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{pool.name}</h3>
                    <p className="text-xs text-muted-foreground">{poolChats.length} messages · {pool.current_participants} participants</p>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {poolChats.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No messages yet</p>
                  ) : (
                    poolChats.slice(0, 20).map((msg: any) => (
                      <div key={msg.id} className="text-xs p-2 rounded bg-secondary/30">
                        <span className="text-muted-foreground">{new Date(msg.created_at).toLocaleString()}: </span>
                        <span>{msg.message}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminChat;
