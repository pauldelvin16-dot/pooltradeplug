import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, CheckCircle, XCircle, Webhook, Trash2, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

const AdminTelegram = () => {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: adminSettings, refetch } = useQuery({
    queryKey: ["admin-settings-panel"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const settings = adminSettings as any;
  const hasToken = !!settings?.telegram_bot_token;
  const hasChatId = !!settings?.telegram_admin_chat_id;
  const token = settings?.telegram_bot_token;

  const { data: linkedProfiles = [] } = useQuery({
    queryKey: ["admin-telegram-linked"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, email, telegram_chat_id")
        .eq("telegram_linked", true);
      return data || [];
    },
  });

  // Direct Telegram API call for webhook management
  const callTG = async (method: string, body?: any) => {
    if (!token) throw new Error("Bot token not configured");
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  };

  const setWebhook = async () => {
    if (!webhookUrl.trim()) return toast.error("Enter a webhook URL");
    setBusy("set");
    try {
      const res = await callTG("setWebhook", { url: webhookUrl.trim(), allowed_updates: ["message", "callback_query"] });
      if (res.ok) toast.success("Webhook set successfully");
      else toast.error(res.description || "Failed to set webhook");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const deleteWebhook = async () => {
    setBusy("del");
    try {
      const res = await callTG("deleteWebhook", { drop_pending_updates: false });
      if (res.ok) toast.success("Webhook removed — long-polling active");
      else toast.error(res.description || "Failed");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const getWebhookInfo = async () => {
    setBusy("info");
    try {
      const res = await callTG("getWebhookInfo");
      if (res.ok) {
        const url = res.result.url || "(none)";
        toast.success(`Current webhook: ${url}`);
      } else toast.error(res.description || "Failed");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const triggerPoll = async () => {
    setBusy("poll");
    try {
      const { error } = await supabase.functions.invoke("telegram-poll");
      if (error) throw error;
      toast.success("Poll triggered — check bot in Telegram");
    } catch (e: any) {
      toast.error(e.message || "Failed to trigger poll");
    } finally {
      setBusy(null);
    }
  };

  const removeBot = async () => {
    if (!confirm("Remove bot configuration? Users won't be able to use the bot until reconfigured.")) return;
    const { error } = await supabase
      .from("admin_settings")
      .update({ telegram_bot_token: null, telegram_admin_chat_id: null, telegram_bot_link: null })
      .eq("id", settings.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Bot configuration removed");
      refetch();
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-display font-bold">Telegram Bot Control</h2>

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

      {/* Webhook Management */}
      {hasToken && (
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Webhook & Polling</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Long-polling runs every minute via cron. If you prefer real-time webhooks, set one below.
            Setting a webhook will disable long-polling automatically.
          </p>

          <div className="space-y-2">
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/telegram-webhook"
                className="bg-secondary/50 border-border"
              />
              <Button onClick={setWebhook} disabled={busy === "set"} className="gold-gradient text-primary-foreground hover:opacity-90 shrink-0">
                Set Webhook
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={getWebhookInfo} disabled={busy === "info"} className="border-border">
              <RefreshCw className="w-4 h-4 mr-2" /> Check Webhook
            </Button>
            <Button size="sm" variant="outline" onClick={deleteWebhook} disabled={busy === "del"} className="border-destructive/30 text-destructive hover:bg-destructive/10">
              <Trash2 className="w-4 h-4 mr-2" /> Remove Webhook
            </Button>
            <Button size="sm" variant="outline" onClick={triggerPoll} disabled={busy === "poll"} className="border-primary/30 text-primary hover:bg-primary/10">
              <Play className="w-4 h-4 mr-2" /> Trigger Poll Now
            </Button>
            <Button size="sm" variant="outline" onClick={removeBot} className="border-destructive/30 text-destructive hover:bg-destructive/10 ml-auto">
              <Trash2 className="w-4 h-4 mr-2" /> Disconnect Bot
            </Button>
          </div>
        </div>
      )}

      {/* Bot Commands */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4">Available Commands</h3>
        <div className="space-y-2">
          {[
            { cmd: "/start", desc: "Welcome message and main menu" },
            { cmd: "/link <email>", desc: "Link Telegram to TradeLux account" },
            { cmd: "/balance", desc: "Check account balance" },
            { cmd: "/deposit", desc: "Get deposit addresses by network" },
            { cmd: "/submit <amount> <txid>", desc: "Submit a deposit for confirmation" },
            { cmd: "/pools", desc: "View active trading pools" },
            { cmd: "/join", desc: "Join a pool from the list" },
            { cmd: "/resetpassword", desc: "Get a temporary password" },
            { cmd: "/help", desc: "Show all available commands" },
          ].map((c) => (
            <div key={c.cmd} className="flex items-center gap-3 p-2 rounded bg-secondary/30">
              <code className="text-xs text-primary font-mono bg-primary/10 px-2 py-0.5 rounded shrink-0">{c.cmd}</code>
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
    </div>
  );
};

export default AdminTelegram;
