import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTraders, useMySubscriptions, useTraderTrades } from "@/hooks/useCopyTrading";
import TraderCard, { type Trader } from "@/components/copy/TraderCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Copy, TrendingUp, Wallet, StopCircle, Plus, Minus, Search } from "lucide-react";

const CopyTradingPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const { data: traders = [], isLoading } = useTraders();
  const { data: subs = [] } = useMySubscriptions(user?.id);
  const { data: trades = [] } = useTraderTrades();

  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState<string>("all");
  const [selected, setSelected] = useState<Trader | null>(null);
  const [amount, setAmount] = useState("");
  const [ratio, setRatio] = useState(100);
  const [busy, setBusy] = useState(false);
  const [adjust, setAdjust] = useState<{ id: string; delta: string } | null>(null);

  const activeSubs = subs.filter((s: any) => s.status === "active");
  const activeIds = new Set(activeSubs.map((s: any) => s.trader_id));

  const filtered = useMemo(
    () =>
      traders.filter(
        (t) =>
          (risk === "all" || t.risk_level === risk) &&
          (t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.handle.toLowerCase().includes(search.toLowerCase()) ||
            t.strategy.toLowerCase().includes(search.toLowerCase())),
      ),
    [traders, risk, search],
  );

  const totalAllocated = activeSubs.reduce((a: number, s: any) => a + Number(s.allocation || 0), 0);
  const totalPnl = activeSubs.reduce((a: number, s: any) => a + Number(s.pnl || 0), 0);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["copy-subscriptions"] }),
      qc.invalidateQueries({ queryKey: ["copy-traders"] }),
      refreshProfile(),
    ]);
  };

  const confirmCopy = async () => {
    if (!selected) return;
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)("follow_trader", {
      _trader_id: selected.id,
      _amount: Number(amount),
      _copy_ratio: ratio,
    });
    setBusy(false);
    const res: any = data;
    if (error || !res?.ok) {
      toast({ title: "Could not start copying", description: error?.message || res?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Copy trading started", description: `You are now copying ${selected.name}.` });
    setSelected(null);
    setAmount("");
    await refresh();
  };

  const stop = async (id: string) => {
    const { data, error } = await (supabase.rpc as any)("stop_copy_trading", { _subscription_id: id });
    const res: any = data;
    if (error || !res?.ok) {
      toast({ title: "Could not stop", description: error?.message || res?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Stopped copying", description: `$${Number(res.returned).toFixed(2)} returned to your balance.` });
    await refresh();
  };

  const applyAdjust = async (sign: 1 | -1) => {
    if (!adjust) return;
    const { data, error } = await (supabase.rpc as any)("adjust_copy_allocation", {
      _subscription_id: adjust.id,
      _delta: sign * Number(adjust.delta),
    });
    const res: any = data;
    if (error || !res?.ok) {
      toast({ title: "Could not update allocation", description: error?.message || res?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Allocation updated" });
    setAdjust(null);
    await refresh();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-display font-bold">
          Copy <span className="gold-text">Trading</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mirror verified traders automatically. Allocate funds, set your copy ratio, stop any time.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Available balance</p>
          <p className="text-xl font-bold gold-text">${Number(profile?.balance || 0).toFixed(2)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Allocated to copying</p>
          <p className="text-xl font-bold">${totalAllocated.toFixed(2)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Copy P&L</p>
          <p className={`text-xl font-bold ${totalPnl >= 0 ? "text-primary" : "text-destructive"}`}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Traders copied</p>
          <p className="text-xl font-bold">{activeSubs.length}</p>
        </div>
      </div>

      {activeSubs.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> My copy positions</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {activeSubs.map((s: any) => (
              <div key={s.id} className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.copy_traders?.name || "Trader"}</p>
                    <p className="text-xs text-muted-foreground">
                      Allocated ${Number(s.allocation).toFixed(2)} · {Number(s.copy_ratio)}% ratio
                    </p>
                  </div>
                  <p className={`text-lg font-bold ${Number(s.pnl) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {Number(s.pnl) >= 0 ? "+" : ""}${Number(s.pnl).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setAdjust({ id: s.id, delta: "50" })}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adjust funds
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => stop(s.id)}>
                    <StopCircle className="w-3.5 h-3.5 mr-1" /> Stop & withdraw
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Top traders</h2>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search traders" className="pl-8 bg-secondary/50" />
            </div>
            <div className="flex rounded-md border border-border overflow-hidden">
              {["all", "low", "medium", "high"].map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`px-2.5 py-1.5 text-xs capitalize ${risk === r ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-10 text-center text-muted-foreground text-sm">No traders match your filters yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <TraderCard
                key={t.id}
                trader={t}
                actionLabel={activeIds.has(t.id) ? "Copying" : "Copy Trader"}
                copying={activeIds.has(t.id)}
                onCopy={(tr) => {
                  setSelected(tr);
                  setAmount(String(tr.min_allocation));
                  setRatio(100);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {trades.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4 text-primary" /> Live copied trades</h2>
          <div className="glass-card divide-y divide-border/60 overflow-hidden">
            {trades.slice(0, 12).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase ${t.side === "long" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                    {t.side}
                  </span>
                  <span className="font-medium truncate">{t.symbol}</span>
                </div>
                <span className={`font-semibold ${Number(t.pnl_pct) >= 0 ? "text-primary" : "text-destructive"}`}>
                  {Number(t.pnl_pct) >= 0 ? "+" : ""}{Number(t.pnl_pct).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Copy dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Copy {selected?.name}</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Funds are moved from your balance into this copy position and returned when you stop.
              </p>
              <div className="space-y-2">
                <Label>Allocation (USDT)</Label>
                <Input type="number" min={selected.min_allocation} value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary/50" />
                <p className="text-xs text-muted-foreground">
                  Minimum ${Number(selected.min_allocation)} · Your balance ${Number(profile?.balance || 0).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Copy ratio — {ratio}%</Label>
                <Slider value={[ratio]} min={10} max={200} step={10} onValueChange={(v) => setRatio(v[0])} />
                <p className="text-xs text-muted-foreground">How large your positions are relative to the trader's.</p>
              </div>
              <div className="rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
                Performance fee {Number(selected.performance_fee)}% on profits · {selected.risk_level} risk · max drawdown {Number(selected.max_drawdown)}%
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button disabled={busy || !amount} onClick={confirmCopy} className="gold-gradient text-primary-foreground font-semibold">
              {busy ? "Starting…" : "Start copying"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust dialog */}
      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adjust allocation</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Amount (USDT)</Label>
            <Input type="number" value={adjust?.delta || ""} onChange={(e) => setAdjust((a) => (a ? { ...a, delta: e.target.value } : a))} className="bg-secondary/50" />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => applyAdjust(-1)}><Minus className="w-3.5 h-3.5 mr-1" /> Withdraw</Button>
            <Button onClick={() => applyAdjust(1)} className="gold-gradient text-primary-foreground font-semibold">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add funds
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CopyTradingPage;
