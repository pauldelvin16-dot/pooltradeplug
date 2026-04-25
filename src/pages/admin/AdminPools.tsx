import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import { Plus, Edit2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

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

  const openEdit = (pool: any) => {
    setEditingPool(pool);
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Current Profit ($)</Label><Input type="number" value={editProfit} onChange={(e) => setEditProfit(e.target.value)} className="bg-secondary/50 border-border" /></div>
              <div className="space-y-2"><Label>Participants Count</Label><Input type="number" value={editParticipants} onChange={(e) => setEditParticipants(e.target.value)} className="bg-secondary/50 border-border" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Traded Symbol</Label><Input value={editSymbol} onChange={(e) => setEditSymbol(e.target.value)} placeholder="XAUUSD" className="bg-secondary/50 border-border" /></div>
              <div className="space-y-2"><Label>Profit Split %</Label><Input type="number" value={editSplit} onChange={(e) => setEditSplit(e.target.value)} className="bg-secondary/50 border-border" /></div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90" onClick={() => {
              if (!editingPool) return;
              updatePool.mutate({
                id: editingPool.id,
                updates: {
                  current_profit: parseFloat(editProfit),
                  current_participants: parseInt(editParticipants),
                  traded_symbol: editSymbol || null,
                  profit_split_percentage: parseFloat(editSplit),
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
              <div className="flex items-center gap-2">
                {pool.status === "active" && pool.current_participants < pool.max_participants && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-success border-success/40 hover:bg-success/10"
                    onClick={() => updatePool.mutate({
                      id: pool.id,
                      updates: { current_participants: pool.max_participants },
                    })}
                  >
                    🚀 Force Start
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openEdit(pool)} className="text-primary hover:bg-primary/10">
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminPools;
