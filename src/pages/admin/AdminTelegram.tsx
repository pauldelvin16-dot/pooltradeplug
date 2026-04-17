import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, CheckCircle, XCircle } from "lucide-react";

const AdminTelegram = () => {
  const { data: adminSettings } = useQuery({
    queryKey: ["admin-settings-panel"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const settings = adminSettings as any;
  const hasToken = !!settings?.telegram_bot_token;
  const hasChatId = !!settings?.telegram_admin_chat_id;

  // Count linked users
  const { data: linkedProfiles = [] } = useQuery({
    queryKey: ["admin-telegram-linked"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, first_name, last_name, email, telegram_chat_id").eq("telegram_linked", true);
      return data || [];
    },
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-display font-bold">Telegram Bot</h2>

      {/* Status */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Bot Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
            {hasToken ? <CheckCircle className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-destructive" />}
            <div>
              <p className="text-sm font-medium">Bot Token</p>
              <p className="text-xs text-muted-foreground">{hasToken ? "Configured" : "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
            {hasChatId ? <CheckCircle className="w-5 h-5 text-success" /> : <XCircle className="w-5 h-5 text-destructive" />}
            <div>
              <p className="text-sm font-medium">Admin Chat ID</p>
              <p className="text-xs text-muted-foreground">{hasChatId ? "Configured" : "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
            <Bot className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Linked Users</p>
              <p className="text-xs text-muted-foreground">{linkedProfiles.length} users</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bot Commands */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Available Commands</h3>
        <div className="space-y-3">
          {[
            { cmd: "/start", desc: "Welcome message and instructions" },
            { cmd: "/link <email>", desc: "Link Telegram to TradeLux account" },
            { cmd: "/balance", desc: "Check account balance" },
            { cmd: "/deposit", desc: "Get deposit addresses and instructions" },
            { cmd: "/pools", desc: "View active trading pools" },
            { cmd: "/help", desc: "Show all available commands" },
          ].map((c) => (
            <div key={c.cmd} className="flex items-center gap-3 p-2 rounded bg-secondary/30">
              <code className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">{c.cmd}</code>
              <span className="text-sm text-muted-foreground">{c.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Linked Users */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Linked Users ({linkedProfiles.length})</h3>
        {linkedProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No users have linked their Telegram account yet.</p>
        ) : (
          <div className="space-y-2">
            {linkedProfiles.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <div>
                  <p className="text-sm font-medium">{p.first_name} {p.last_name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{p.telegram_chat_id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <p className="text-xs text-muted-foreground">
          💡 Configure your bot token and admin chat ID in <strong>Settings</strong> tab. 
          The bot will automatically respond to commands and link user accounts via email verification.
        </p>
      </div>
    </div>
  );
};

export default AdminTelegram;
