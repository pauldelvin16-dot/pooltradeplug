import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Edit2, Trash2, Sparkles, Pause, Play, FileEdit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const CFD_CRYPTO_SYMBOLS = [
  "BTCUSD", "ETHUSD", "BNBUSD", "SOLUSD", "XRPUSD", "ADAUSD", "DOGEUSD", "AVAXUSD",
  "DOTUSD", "TRXUSD", "LINKUSD", "MATICUSD", "TONUSD", "LTCUSD", "BCHUSD", "UNIUSD",
  "ATOMUSD", "NEARUSD", "APTUSD", "ARBUSD", "OPUSD", "SUIUSD", "SEIUSD", "INJUSD",
  "RNDRUSD", "FILUSD", "ETCUSD", "XLMUSD", "HBARUSD", "AAVEUSD", "MKRUSD", "ICPUSD",
  "PEPEUSD", "SHIBUSD", "FETUSD", "TIAUSD", "WIFUSD", "JUPUSD", "PYTHUSD", "ORDIUSD",
];

const POOL_TEMPLATES = [
  { theme: "Momentum", risk: "Balanced", split: 72, days: 14, note: "breakout rotation, staggered entries, and daily settlement review" },
  { theme: "Scalp Basket", risk: "Active", split: 68, days: 7, note: "short-duration CFD scalps with tight exposure windows" },
  { theme: "Swing Alpha", risk: "Moderate", split: 75, days: 21, note: "multi-day trend capture with protected exit planning" },
  { theme: "Yield Guard", risk: "Conservative", split: 65, days: 30, note: "lower-volatility allocation with capital-first settlement rules" },
  { theme: "High Conviction", risk: "Aggressive", split: 80, days: 10, note: "focused volatility strategy for experienced pool participants" },
];

const AdminPools = () => {
  const queryClient = useQueryClient();
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolTarget, setPoolTarget] = useState("");
  const [poolEntry, setPoolEntry] = useState("");
  const [poolMaxParts, setPoolMaxParts] = useState("10");
  const [poolDays, setPoolDays] = useState("30");
  const [poolSymbol, setPoolSymbol] = useState("");
  const [poolSplit, setPoolSplit] = useState("70");
  const [poolRefund, setPoolRefund] = useState("Losses are refunded within 3 business days without profits.");
  const [poolDesc, setPoolDesc] = useState("");

  // Edit states
  const [editingPool, setEditingPool] = useState<any>(null);
  const [editProfit, setEditProfit] = useState("");
  const [editParticipants, setEditParticipants] = useState("");
  const [editSymbol, setEditSymbol] = useState("");
  const [editSplit, setEditSplit] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editEntry, setEditEntry] = useState("");
  const [editMaxParts, setEditMaxParts] = useState("");
  const [editDays, setEditDays] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editRefund, setEditRefund] = useState("");

  const { data: allPools = [] } = useQuery({
    queryKey: ["admin-pools"],
    queryFn: async () => {
      const { data } = await supabase.from("pools").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const createPool = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("pools").insert({
        name: poolName,
        target_profit: parseFloat(poolTarget),
        entry_amount: parseFloat(poolEntry),
        max_participants: parseInt(poolMaxParts),
        duration_days: parseInt(poolDays),
        end_date: new Date(Date.now() + parseInt(poolDays) * 86400000).toISOString(),
        traded_symbol: poolSymbol || null,
        profit_split_percentage: parseFloat(poolSplit),
        refund_policy: poolRefund,
        description: poolDesc || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pool created!");
      setPoolDialogOpen(false);
      setPoolName(""); setPoolTarget(""); setPoolEntry(""); setPoolSymbol(""); setPoolDesc("");
      queryClient.invalidateQueries({ queryKey: ["admin-pools"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePool = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("pools").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pool updated!");
      setEditingPool(null);
      queryClient.invalidateQueries({ queryKey: ["admin-pools"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deletePool = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pools").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pool deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-pools"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generateDemoPool = () => {
    const symbol = CFD_CRYPTO_SYMBOLS[Math.floor(Math.random() * CFD_CRYPTO_SYMBOLS.length)];
    const template = POOL_TEMPLATES[Math.floor(Math.random() * POOL_TEMPLATES.length)];
    const entry = [100, 250, 500, 1000][Math.floor(Math.random() * 4)];
    const max = [12, 20, 30, 50][Math.floor(Math.random() * 4)];
    setPoolName(`${symbol} ${template.theme} Pool`);
    setPoolSymbol(symbol);
    setPoolEntry(String(entry));
    setPoolTarget(String(Math.round(entry * max * (0.35 + Math.random()))));
    setPoolMaxParts(String(max));
    setPoolDays(String(template.days));
    setPoolSplit(String(template.split));
    setPoolDesc(`${template.risk} ${symbol} CFD crypto trading pool using ${template.note}.`);
    setPoolRefund("If target is missed, eligible capital is refunded according to admin settlement review.");
  };

  const autoGeneratePools = useMutation({
    mutationFn: async () => {
      const selected = [...CFD_CRYPTO_SYMBOLS].sort(() => Math.random() - 0.5).slice(0, 8);
      const rows = selected.map((symbol, index) => {
        const template = POOL_TEMPLATES[index % POOL_TEMPLATES.length];
        const entry = [100, 150, 250, 500, 750, 1000][Math.floor(Math.random() * 6)];
        const max = [10, 16, 24, 32, 40][Math.floor(Math.random() * 5)];
        const days = template.days;
        return {
          name: `${symbol} ${template.theme} ${index + 1}`,
          target_profit: Math.round(entry * max * (0.45 + Math.random() * 0.8)),
          entry_amount: entry,
          max_participants: max,
          duration_days: days,
          end_date: new Date(Date.now() + days * 86400000).toISOString(),
          traded_symbol: symbol,
          profit_split_percentage: template.split,
          refund_policy: "Capital is settled by admin review; eligible users can request payout after pool completion.",
          description: `${template.risk} auto-generated crypto CFD pool with ${template.note}.`,
          status: index < 4 ? "active" : "draft",
        };
      });
      const { error } = await supabase.from("pools").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auto-generated 8 crypto CFD pools");
      queryClient.invalidateQueries({ queryKey: ["admin-pools"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (pool: any) => {
    setEditingPool(pool);
    setEditName(pool.name || "");
    setEditTarget(String(pool.target_profit));
    setEditEntry(String(pool.entry_amount));
    setEditMaxParts(String(pool.max_participants));
    setEditDays(String(pool.duration_days || 30));
    setEditDesc(pool.description || "");
    setEditRefund(pool.refund_policy || "");
    setEditProfit(String(pool.current_profit));
    setEditParticipants(String(pool.current_participants));
    setEditSymbol(pool.traded_symbol || "");
    setEditSplit(String(pool.profit_split_percentage || 70));
    setEditStatus(pool.status);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">Pool Management</h2>
        <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-1" /> Create Pool
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Trading Pool</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Button type="button" variant="outline" size="sm" onClick={generateDemoPool} className="w-full border-primary/30 text-primary hover:bg-primary/10">
                <Sparkles className="w-4 h-4 mr-1" /> Generate polished pool template
              </Button>
              <div className="space-y-2"><Label>Pool Name</Label><Input value={poolName} onChange={(e) => setPoolName(e.target.value)} placeholder="e.g. Gold Rush Alpha" className="bg-secondary/50 border-border" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={poolDesc} onChange={(e) => setPoolDesc(e.target.value)} placeholder="Pool description..." className="bg-secondary/50 border-border" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Traded Symbol</Label><Input value={poolSymbol} onChange={(e) => setPoolSymbol(e.target.value)} placeholder="e.g. XAUUSD" className="bg-secondary/50 border-border" /></div>
                <div className="space-y-2"><Label>Profit Split %</Label><Input type="number" value={poolSplit} onChange={(e) => setPoolSplit(e.target.value)} className="bg-secondary/50 border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Target Profit ($)</Label><Input type="number" value={poolTarget} onChange={(e) => setPoolTarget(e.target.value)} className="bg-secondary/50 border-border" /></div>
                <div className="space-y-2"><Label>Entry Amount ($)</Label><Input type="number" value={poolEntry} onChange={(e) => setPoolEntry(e.target.value)} className="bg-secondary/50 border-border" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Max Participants</Label><Input type="number" value={poolMaxParts} onChange={(e) => setPoolMaxParts(e.target.value)} className="bg-secondary/50 border-border" /></div>
                <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={poolDays} onChange={(e) => setPoolDays(e.target.value)} className="bg-secondary/50 border-border" /></div>
              </div>
              <div className="space-y-2"><Label>Refund Policy</Label><Textarea value={poolRefund} onChange={(e) => setPoolRefund(e.target.value)} className="bg-secondary/50 border-border text-xs" /></div>
              <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90" disabled={!poolName || !poolTarget || !poolEntry || createPool.isPending} onClick={() => createPool.mutate()}>
                {createPool.isPending ? "Creating..." : "Create Pool"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPool} onOpenChange={(open) => !open && setEditingPool(null)}>
        <DialogContent className="glass-card border-border">
          <DialogHeader><DialogTitle>Edit Pool: {editingPool?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Pool Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-secondary/50 border-border" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="bg-secondary/50 border-border" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Entry Amount ($)</Label><Input type="number" value={editEntry} onChange={(e) => setEditEntry(e.target.value)} className="bg-secondary/50 border-border" /></div>
              <div className="space-y-2"><Label>Target Profit ($)</Label><Input type="number" value={editTarget} onChange={(e) => setEditTarget(e.target.value)} className="bg-secondary/50 border-border" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Current Profit ($)</Label><Input type="number" value={editProfit} onChange={(e) => setEditProfit(e.target.value)} className="bg-secondary/50 border-border" /></div>
              <div className="space-y-2"><Label>Participants Count</Label><Input type="number" value={editParticipants} onChange={(e) => setEditParticipants(e.target.value)} className="bg-secondary/50 border-border" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Max Participants</Label><Input type="number" value={editMaxParts} onChange={(e) => setEditMaxParts(e.target.value)} className="bg-secondary/50 border-border" /></div>
              <div className="space-y-2"><Label>Duration (days)</Label><Input type="number" value={editDays} onChange={(e) => setEditDays(e.target.value)} className="bg-secondary/50 border-border" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Traded Symbol</Label><Input value={editSymbol} onChange={(e) => setEditSymbol(e.target.value)} placeholder="XAUUSD" className="bg-secondary/50 border-border" /></div>
              <div className="space-y-2"><Label>Profit Split %</Label><Input type="number" value={editSplit} onChange={(e) => setEditSplit(e.target.value)} className="bg-secondary/50 border-border" /></div>
            </div>
            <div className="space-y-2"><Label>Refund Policy</Label><Textarea value={editRefund} onChange={(e) => setEditRefund(e.target.value)} className="bg-secondary/50 border-border text-xs" /></div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
                <option value="draft">Draft (hidden from users)</option>
                <option value="active">Active (open to join)</option>
                <option value="paused">Paused (visible, withdrawals locked)</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
                <option value="deleted">Deleted (archived)</option>
              </select>
            </div>
            <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90" onClick={() => {
              if (!editingPool) return;
              updatePool.mutate({
                id: editingPool.id,
                updates: {
                  name: editName,
                  description: editDesc || null,
                  entry_amount: parseFloat(editEntry),
                  target_profit: parseFloat(editTarget),
                  current_profit: parseFloat(editProfit),
                  current_participants: parseInt(editParticipants),
                  max_participants: parseInt(editMaxParts),
                  duration_days: parseInt(editDays),
                  end_date: new Date(Date.now() + (parseInt(editDays) || 30) * 86400000).toISOString(),
                  traded_symbol: editSymbol || null,
                  profit_split_percentage: parseFloat(editSplit),
                  refund_policy: editRefund,
                  status: editStatus,
                },
              });
            }}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="glass-card p-6 space-y-3">
        {allPools.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No pools created yet</p>
        ) : (
          allPools.map((pool: any) => (
            <div key={pool.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{pool.name}</p>
                  {(pool as any).traded_symbol && (
                    <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent-foreground font-mono">{(pool as any).traded_symbol}</span>
                  )}
                  <StatusBadge status={pool.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  ${parseFloat(pool.current_profit).toLocaleString()} / ${parseFloat(pool.target_profit).toLocaleString()} · 
                  {pool.current_participants}/{pool.max_participants} participants · 
                  {(pool as any).profit_split_percentage || 70}% split
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {pool.status === "active" && (
                  <Button size="sm" variant="outline" className="text-warning border-warning/40 hover:bg-warning/10"
                    onClick={() => updatePool.mutate({ id: pool.id, updates: { status: "paused" } })}>
                    <Pause className="w-4 h-4 mr-1" /> Pause
                  </Button>
                )}
                {pool.status === "paused" && (
                  <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10"
                    onClick={() => updatePool.mutate({ id: pool.id, updates: { status: "active" } })}>
                    <Play className="w-4 h-4 mr-1" /> Resume
                  </Button>
                )}
                {pool.status === "draft" && (
                  <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10"
                    onClick={() => updatePool.mutate({ id: pool.id, updates: { status: "active" } })}>
                    <Play className="w-4 h-4 mr-1" /> Publish
                  </Button>
                )}
                {pool.status === "active" && pool.current_participants < pool.max_participants && (
                  <Button size="sm" variant="outline" className="text-success border-success/40 hover:bg-success/10"
                    onClick={() => updatePool.mutate({ id: pool.id, updates: { current_participants: pool.max_participants } })}>
                    🚀 Force Start
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(pool)} className="text-primary hover:bg-primary/10">
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete pool "{pool.name}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This archives the pool (status = deleted) and hides it from users immediately. Existing participants keep their records. Use Edit → status to restore.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => updatePool.mutate({ id: pool.id, updates: { status: "deleted" } })} className="bg-destructive text-destructive-foreground">
                        Archive pool
                      </AlertDialogAction>
                      <AlertDialogAction onClick={() => deletePool.mutate(pool.id)} className="bg-destructive/80 text-destructive-foreground">
                        Permanently delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPools;
