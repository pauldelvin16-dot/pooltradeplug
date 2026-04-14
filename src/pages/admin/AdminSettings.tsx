import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleLeft, ToggleRight, Plus, Save } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const queryClient = useQueryClient();

  const { data: adminSettings } = useQuery({
    queryKey: ["admin-settings-panel"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("*").limit(1).single();
      return data;
    },
  });

  const { data: cryptoAddresses = [] } = useQuery({
    queryKey: ["admin-crypto-addresses"],
    queryFn: async () => {
      const { data } = await supabase.from("crypto_addresses").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Landing stats state
  const [statTraders, setStatTraders] = useState("");
  const [statVolume, setStatVolume] = useState("");
  const [statPools, setStatPools] = useState("");
  const [statUptime, setStatUptime] = useState("");

  // Telegram config
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");

  useEffect(() => {
    if (adminSettings) {
      const s = adminSettings as any;
      setStatTraders(s.stat_active_traders || "");
      setStatVolume(s.stat_total_volume || "");
      setStatPools(s.stat_trading_pools || "");
      setStatUptime(s.stat_uptime || "");
      setTgToken(s.telegram_bot_token || "");
      setTgChatId(s.telegram_admin_chat_id || "");
    }
  }, [adminSettings]);

  // Mutations
  const toggleSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      if (!adminSettings?.id) return;
      const updateObj: Record<string, boolean> = {};
      updateObj[key] = value;
      const { error } = await supabase.from("admin_settings").update(updateObj as any).eq("id", adminSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Setting updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-panel"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const updateStats = useMutation({
    mutationFn: async () => {
      if (!adminSettings?.id) return;
      const { error } = await supabase.from("admin_settings").update({
        stat_active_traders: statTraders,
        stat_total_volume: statVolume,
        stat_trading_pools: statPools,
        stat_uptime: statUptime,
      } as any).eq("id", adminSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Landing page stats updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-panel"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const updateTelegram = useMutation({
    mutationFn: async () => {
      if (!adminSettings?.id) return;
      const { error } = await supabase.from("admin_settings").update({
        telegram_bot_token: tgToken || null,
        telegram_admin_chat_id: tgChatId || null,
      } as any).eq("id", adminSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Telegram config updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-panel"] });
    },
  });

  // Crypto addresses
  const [newAddress, setNewAddress] = useState("");
  const [newNetwork, setNewNetwork] = useState("TRC20");
  const [newCurrency, setNewCurrency] = useState("USDT");
  const [newLabel, setNewLabel] = useState("");

  const addAddress = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crypto_addresses").insert({
        address: newAddress, network: newNetwork, currency: newCurrency, label: newLabel || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Address added!");
      setNewAddress(""); setNewLabel("");
      queryClient.invalidateQueries({ queryKey: ["admin-crypto-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["crypto-addresses"] });
    },
  });

  const toggleAddress = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("crypto_addresses").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-crypto-addresses"] });
      queryClient.invalidateQueries({ queryKey: ["crypto-addresses"] });
    },
  });

  const settingsToggles = [
    { key: "deposits_enabled", label: "Deposits", desc: "Enable/disable deposits platform-wide" },
    { key: "withdrawals_enabled", label: "Withdrawals", desc: "Enable/disable withdrawals" },
    { key: "mt5_enabled", label: "MT5 Management", desc: "Enable/disable MT5 features" },
    { key: "pools_enabled", label: "Pool Trading", desc: "Enable/disable pool trading" },
    { key: "registrations_enabled", label: "New Registrations", desc: "Allow new users to sign up" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-3xl">
      <h2 className="text-xl font-display font-bold">Platform Settings</h2>

      {/* Platform Controls */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold">Platform Controls</h3>
        {settingsToggles.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <button onClick={() => toggleSetting.mutate({ key: item.key, value: !(adminSettings as any)?.[item.key] })}>
              {(adminSettings as any)?.[item.key] ? <ToggleRight className="w-6 h-6 text-success" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
            </button>
          </div>
        ))}
      </div>

      {/* Landing Page Statistics */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold">Landing Page Statistics</h3>
        <p className="text-xs text-muted-foreground">These values are displayed on the public landing page.</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label>Active Traders</Label><Input value={statTraders} onChange={(e) => setStatTraders(e.target.value)} className="bg-secondary/50 border-border" /></div>
          <div className="space-y-2"><Label>Total Volume</Label><Input value={statVolume} onChange={(e) => setStatVolume(e.target.value)} className="bg-secondary/50 border-border" /></div>
          <div className="space-y-2"><Label>Trading Pools</Label><Input value={statPools} onChange={(e) => setStatPools(e.target.value)} className="bg-secondary/50 border-border" /></div>
          <div className="space-y-2"><Label>Uptime</Label><Input value={statUptime} onChange={(e) => setStatUptime(e.target.value)} className="bg-secondary/50 border-border" /></div>
        </div>
        <Button size="sm" onClick={() => updateStats.mutate()} disabled={updateStats.isPending} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
          <Save className="w-4 h-4 mr-1" /> {updateStats.isPending ? "Saving..." : "Save Stats"}
        </Button>
      </div>

      {/* Telegram Bot Config */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold">Telegram Bot Configuration</h3>
        <p className="text-xs text-muted-foreground">Configure your Telegram bot for notifications and user interactions.</p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Bot Token</Label>
            <Input type="password" value={tgToken} onChange={(e) => setTgToken(e.target.value)} placeholder="123456:ABC-DEF..." className="bg-secondary/50 border-border font-mono text-xs" />
          </div>
          <div className="space-y-2">
            <Label>Admin Chat ID</Label>
            <Input value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="e.g. -1001234567890" className="bg-secondary/50 border-border font-mono text-xs" />
          </div>
        </div>
        <Button size="sm" onClick={() => updateTelegram.mutate()} disabled={updateTelegram.isPending} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
          <Save className="w-4 h-4 mr-1" /> {updateTelegram.isPending ? "Saving..." : "Save Telegram Config"}
        </Button>
      </div>

      {/* Countdown Setting */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold">Deposit Settings</h3>
        <div className="space-y-2">
          <Label>Deposit Countdown (minutes)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              defaultValue={adminSettings?.deposit_countdown_minutes || 30}
              className="bg-secondary/50 border-border w-32"
              onKeyDown={(e) => {
                if (e.key === "Enter" && adminSettings?.id) {
                  const val = parseInt((e.target as HTMLInputElement).value);
                  if (!isNaN(val)) {
                    supabase.from("admin_settings").update({ deposit_countdown_minutes: val }).eq("id", adminSettings.id).then(() => {
                      toast.success("Countdown updated!");
                      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
                    });
                  }
                }
              }}
            />
            <span className="text-xs text-muted-foreground self-center">Press Enter to save</span>
          </div>
        </div>
      </div>

      {/* Crypto Addresses */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold">Crypto Deposit Addresses</h3>
        <div className="space-y-3">
          {cryptoAddresses.map((addr: any) => (
            <div key={addr.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{addr.currency} ({addr.network})</span>
                  {addr.label && <span className="text-xs text-muted-foreground">{addr.label}</span>}
                  {!addr.is_active && <span className="text-xs text-destructive">Disabled</span>}
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{addr.address}</p>
              </div>
              <button onClick={() => toggleAddress.mutate({ id: addr.id, active: !addr.is_active })}>
                {addr.is_active ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <Label className="text-sm font-medium">Add New Address</Label>
          <Input placeholder="Wallet address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="bg-secondary/50 border-border font-mono text-xs" />
          <div className="grid grid-cols-3 gap-2">
            <select value={newCurrency} onChange={(e) => setNewCurrency(e.target.value)} className="h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
              <option value="USDT">USDT</option><option value="USDC">USDC</option><option value="BTC">BTC</option><option value="ETH">ETH</option>
            </select>
            <select value={newNetwork} onChange={(e) => setNewNetwork(e.target.value)} className="h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
              <option value="TRC20">TRC20</option><option value="ERC20">ERC20</option><option value="BEP20">BEP20</option><option value="Bitcoin">Bitcoin</option><option value="Polygon">Polygon</option>
            </select>
            <Input placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="bg-secondary/50 border-border text-sm" />
          </div>
          <Button size="sm" disabled={!newAddress || addAddress.isPending} onClick={() => addAddress.mutate()} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
            <Plus className="w-4 h-4 mr-1" /> {addAddress.isPending ? "Adding..." : "Add Address"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
