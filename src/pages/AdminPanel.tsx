import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, BarChart3, Wallet, Trophy, Settings, ArrowLeft, Shield, Eye, Ban, CheckCircle, XCircle, ToggleLeft, ToggleRight, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Tab = "overview" | "users" | "mt5" | "deposits" | "withdrawals" | "pools" | "settings";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "users", label: "Users", icon: Users },
  { key: "mt5", label: "MT5", icon: BarChart3 },
  { key: "deposits", label: "Deposits", icon: Wallet },
  { key: "withdrawals", label: "Withdrawals", icon: Wallet },
  { key: "pools", label: "Pools", icon: Trophy },
  { key: "settings", label: "Settings", icon: Settings },
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Data queries
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, user_roles(role)");
      return data || [];
    },
  });

  const { data: allDeposits = [] } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*, profiles!deposits_user_id_fkey(first_name, last_name, email)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allWithdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*, profiles!withdrawals_user_id_fkey(first_name, last_name, email)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allMt5 = [] } = useQuery({
    queryKey: ["admin-mt5"],
    queryFn: async () => {
      const { data } = await supabase.from("mt5_accounts").select("*, profiles!mt5_accounts_user_id_fkey(first_name, last_name, email)").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: allPools = [] } = useQuery({
    queryKey: ["admin-pools"],
    queryFn: async () => {
      const { data } = await supabase.from("pools").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

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

  // Mutations
  const updateDeposit = useMutation({
    mutationFn: async ({ id, status, userId, amount }: { id: string; status: string; userId: string; amount: number }) => {
      const { error } = await supabase.from("deposits").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      if (status === "confirmed") {
        // Update user balance
        const { data: profile } = await supabase.from("profiles").select("balance").eq("user_id", userId).single();
        if (profile) {
          await supabase.from("profiles").update({ balance: parseFloat(profile.balance as any) + amount }).eq("user_id", userId);
        }
      }
    },
    onSuccess: () => {
      toast.success("Deposit updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
  });

  const updateWithdrawal = useMutation({
    mutationFn: async ({ id, status, userId, amount }: { id: string; status: string; userId: string; amount: number }) => {
      const { error } = await supabase.from("withdrawals").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      if (status === "approved") {
        const { data: profile } = await supabase.from("profiles").select("balance").eq("user_id", userId).single();
        if (profile) {
          await supabase.from("profiles").update({ balance: Math.max(0, parseFloat(profile.balance as any) - amount) }).eq("user_id", userId);
        }
      }
    },
    onSuccess: () => {
      toast.success("Withdrawal updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
  });

  const updateMt5Status = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("mt5_accounts").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("MT5 status updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-mt5"] });
    },
  });

  const toggleSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      if (!adminSettings?.id) return;
      const { error } = await supabase.from("admin_settings").update({ [key]: value }).eq("id", adminSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Setting updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-settings-panel"] });
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  // Crypto address management
  const [newAddress, setNewAddress] = useState("");
  const [newNetwork, setNewNetwork] = useState("TRC20");
  const [newCurrency, setNewCurrency] = useState("USDT");
  const [newLabel, setNewLabel] = useState("");

  const addAddress = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crypto_addresses").insert({
        address: newAddress,
        network: newNetwork,
        currency: newCurrency,
        label: newLabel || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Address added!");
      setNewAddress("");
      setNewLabel("");
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

  // Pool creation
  const [poolName, setPoolName] = useState("");
  const [poolTarget, setPoolTarget] = useState("");
  const [poolEntry, setPoolEntry] = useState("");
  const [poolMaxParts, setPoolMaxParts] = useState("10");
  const [poolDays, setPoolDays] = useState("30");
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);

  const createPool = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pools").insert({
        name: poolName,
        target_profit: parseFloat(poolTarget),
        entry_amount: parseFloat(poolEntry),
        max_participants: parseInt(poolMaxParts),
        duration_days: parseInt(poolDays),
        end_date: new Date(Date.now() + parseInt(poolDays) * 86400000).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pool created!");
      setPoolName("");
      setPoolTarget("");
      setPoolEntry("");
      setPoolDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-pools"] });
    },
  });

  const pendingDeposits = allDeposits.filter((d: any) => d.status === "pending");
  const pendingWithdrawals = allWithdrawals.filter((w: any) => w.status === "pending");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">Admin Panel</h1>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">Admin</span>
        </div>
      </header>

      <div className="container py-6">
        <div className="flex gap-1 overflow-x-auto pb-4 mb-6 border-b border-border scrollbar-hide">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeTab === tab.key ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === "deposits" && pendingDeposits.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center">{pendingDeposits.length}</span>
              )}
              {tab.key === "withdrawals" && pendingWithdrawals.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-warning text-warning-foreground text-[10px] flex items-center justify-center">{pendingWithdrawals.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} title="Total Users" value={String(allProfiles.length)} change="Registered" changeType="neutral" />
            <StatCard icon={Wallet} title="Pending Deposits" value={String(pendingDeposits.length)} change="Awaiting review" changeType={pendingDeposits.length > 0 ? "negative" : "neutral"} />
            <StatCard icon={BarChart3} title="MT5 Accounts" value={String(allMt5.length)} change={`${allMt5.filter((a: any) => a.status === "active").length} active`} changeType="neutral" />
            <StatCard icon={Trophy} title="Active Pools" value={String(allPools.filter((p: any) => p.status === "active").length)} change={`${allPools.length} total`} changeType="neutral" />
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">User Management</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-3 font-medium">User</th>
                    <th className="text-left py-3 font-medium">Role</th>
                    <th className="text-left py-3 font-medium">Balance</th>
                    <th className="text-left py-3 font-medium">Telegram</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allProfiles.map((p: any) => (
                    <tr key={p.id} className="hover:bg-secondary/30">
                      <td className="py-3">
                        <p className="font-medium">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </td>
                      <td className="py-3">{(p.user_roles as any)?.[0]?.role || "user"}</td>
                      <td className="py-3">${parseFloat(p.balance).toLocaleString()}</td>
                      <td className="py-3">{p.telegram_linked ? "✓ Linked" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MT5 Admin */}
        {activeTab === "mt5" && (
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">MT5 Account Management</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-3 font-medium">Login</th>
                    <th className="text-left py-3 font-medium">User</th>
                    <th className="text-left py-3 font-medium">Server</th>
                    <th className="text-left py-3 font-medium">Status</th>
                    <th className="text-left py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allMt5.map((acc: any) => (
                    <tr key={acc.id} className="hover:bg-secondary/30">
                      <td className="py-3 font-mono text-xs">{acc.mt5_login}</td>
                      <td className="py-3 text-xs">{(acc.profiles as any)?.email || "—"}</td>
                      <td className="py-3 text-xs">{acc.mt5_server || "—"}</td>
                      <td className="py-3"><StatusBadge status={acc.status === "pending_review" ? "pending" : acc.status === "active" ? "assigned" : acc.status} /></td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {acc.status === "pending_review" && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-success" onClick={() => updateMt5Status.mutate({ id: acc.id, status: "active" })}>
                              Activate
                            </Button>
                          )}
                          {acc.status === "active" && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateMt5Status.mutate({ id: acc.id, status: "disabled" })}>
                              Disable
                            </Button>
                          )}
                          {acc.status === "disabled" && (
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-success" onClick={() => updateMt5Status.mutate({ id: acc.id, status: "active" })}>
                              Enable
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Deposits Admin */}
        {activeTab === "deposits" && (
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">All Deposits</h3>
            <div className="space-y-3">
              {allDeposits.map((d: any) => (
                <div key={d.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{(d.profiles as any)?.first_name} {(d.profiles as any)?.last_name}</p>
                      <StatusBadge status={d.status} />
                    </div>
                    <p className="text-lg font-bold gold-text">${parseFloat(d.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">TXID: {d.txid || "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.network} · {new Date(d.created_at).toLocaleString()}</p>
                  </div>
                  {d.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-success/10 text-success border border-success/20 hover:bg-success/20"
                        onClick={() => updateDeposit.mutate({ id: d.id, status: "confirmed", userId: d.user_id, amount: parseFloat(d.amount) })}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                        onClick={() => updateDeposit.mutate({ id: d.id, status: "rejected", userId: d.user_id, amount: 0 })}>
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {allDeposits.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No deposits yet</p>}
            </div>
          </div>
        )}

        {/* Withdrawals Admin */}
        {activeTab === "withdrawals" && (
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">All Withdrawals</h3>
            <div className="space-y-3">
              {allWithdrawals.map((w: any) => (
                <div key={w.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{(w.profiles as any)?.first_name} {(w.profiles as any)?.last_name}</p>
                      <StatusBadge status={w.status === "completed" ? "confirmed" : w.status === "approved" ? "active" : w.status} />
                    </div>
                    <p className="text-lg font-bold gold-text">${parseFloat(w.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground font-mono">To: {w.wallet_address}</p>
                    <p className="text-xs text-muted-foreground">{w.network} · {new Date(w.created_at).toLocaleString()}</p>
                  </div>
                  {w.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-success/10 text-success border border-success/20 hover:bg-success/20"
                        onClick={() => updateWithdrawal.mutate({ id: w.id, status: "approved", userId: w.user_id, amount: parseFloat(w.amount) })}>
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
                        onClick={() => updateWithdrawal.mutate({ id: w.id, status: "rejected", userId: w.user_id, amount: 0 })}>
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {allWithdrawals.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No withdrawals yet</p>}
            </div>
          </div>
        )}

        {/* Pools Admin */}
        {activeTab === "pools" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pool Management</h3>
              <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
                    <Plus className="w-4 h-4 mr-1" /> Create Pool
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-border">
                  <DialogHeader><DialogTitle>Create Trading Pool</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2"><Label>Pool Name</Label><Input value={poolName} onChange={(e) => setPoolName(e.target.value)} placeholder="e.g. Gold Rush Alpha" className="bg-secondary/50 border-border" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Target Profit ($)</Label><Input type="number" value={poolTarget} onChange={(e) => setPoolTarget(e.target.value)} className="bg-secondary/50 border-border" /></div>
                      <div className="space-y-2"><Label>Entry Amount ($)</Label><Input type="number" value={poolEntry} onChange={(e) => setPoolEntry(e.target.value)} className="bg-secondary/50 border-border" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>Max Participants</Label><Input type="number" value={poolMaxParts} onChange={(e) => setPoolMaxParts(e.target.value)} className="bg-secondary/50 border-border" /></div>
                      <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={poolDays} onChange={(e) => setPoolDays(e.target.value)} className="bg-secondary/50 border-border" /></div>
                    </div>
                    <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90" disabled={!poolName || !poolTarget || !poolEntry || createPool.isPending} onClick={() => createPool.mutate()}>
                      {createPool.isPending ? "Creating..." : "Create Pool"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="glass-card p-6">
              {allPools.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pools created yet</p>
              ) : (
                <div className="space-y-3">
                  {allPools.map((pool: any) => (
                    <div key={pool.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="font-medium">{pool.name}</p>
                        <p className="text-xs text-muted-foreground">${parseFloat(pool.current_profit).toLocaleString()} / ${parseFloat(pool.target_profit).toLocaleString()} · {pool.current_participants}/{pool.max_participants} participants</p>
                      </div>
                      <StatusBadge status={pool.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            {/* Crypto Addresses */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold">Crypto Deposit Addresses</h3>
              <p className="text-sm text-muted-foreground">Add multiple addresses with different networks. Users will see active addresses when depositing.</p>

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
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="BTC">BTC</option>
                    <option value="ETH">ETH</option>
                  </select>
                  <select value={newNetwork} onChange={(e) => setNewNetwork(e.target.value)} className="h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
                    <option value="TRC20">TRC20</option>
                    <option value="ERC20">ERC20</option>
                    <option value="BEP20">BEP20</option>
                    <option value="Bitcoin">Bitcoin</option>
                    <option value="Polygon">Polygon</option>
                  </select>
                  <Input placeholder="Label (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="bg-secondary/50 border-border text-sm" />
                </div>
                <Button size="sm" disabled={!newAddress || addAddress.isPending} onClick={() => addAddress.mutate()} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
                  {addAddress.isPending ? "Adding..." : "Add Address"}
                </Button>
              </div>
            </div>

            {/* Platform Controls */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold">Platform Controls</h3>
              {[
                { key: "deposits_enabled", label: "Deposits", desc: "Enable/disable deposits platform-wide" },
                { key: "mt5_enabled", label: "MT5 Management", desc: "Enable/disable MT5 features" },
                { key: "pools_enabled", label: "Pool Trading", desc: "Enable/disable pool trading" },
                { key: "registrations_enabled", label: "New Registrations", desc: "Allow new users to sign up" },
              ].map((item) => (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
