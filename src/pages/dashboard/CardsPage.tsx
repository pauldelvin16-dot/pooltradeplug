import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, Ban, Unlock, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import VirtualCardVisual, { CARD_DESIGNS, CardDesign } from "@/components/cards/VirtualCardVisual";
import { cn } from "@/lib/utils";

interface VCard {
  id: string;
  brand: string;
  last4: string;
  cardholder_name: string;
  expiry_month: number;
  expiry_year: number;
  balance: number;
  status: string;
  design: CardDesign;
  created_at: string;
}

const CardsPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState<CardDesign>("aurora");
  const [loadOpen, setLoadOpen] = useState<{ id: string; mode: "load" | "unload" } | null>(null);
  const [amount, setAmount] = useState("");
  const [revealed, setRevealed] = useState<Record<string, { number: string; cvv: string }>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["virtual-cards", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_cards" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as VCard[];
    },
    enabled: !!user,
  });

  const { data: txns = [] } = useQuery({
    queryKey: ["card-txns", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("card_transactions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const purchase = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("card-provision", {
        body: { action: "purchase", design: selectedDesign },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("New card issued!");
      setPurchaseOpen(false);
      refreshProfile();
      qc.invalidateQueries({ queryKey: ["virtual-cards"] });
      qc.invalidateQueries({ queryKey: ["card-txns"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to issue card"),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.rpc("set_card_status" as any, { _card_id: id, _status: status });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed");
    },
    onSuccess: () => {
      toast.success("Card updated");
      qc.invalidateQueries({ queryKey: ["virtual-cards"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const moveFunds = useMutation({
    mutationFn: async ({ id, mode, value }: { id: string; mode: "load" | "unload"; value: number }) => {
      const fn = mode === "load" ? "load_virtual_card" : "unload_virtual_card";
      const { data, error } = await supabase.rpc(fn as any, { _card_id: id, _amount: value });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed");
    },
    onSuccess: () => {
      toast.success("Balance updated");
      setLoadOpen(null);
      setAmount("");
      refreshProfile();
      qc.invalidateQueries({ queryKey: ["virtual-cards"] });
      qc.invalidateQueries({ queryKey: ["card-txns"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reveal = async (id: string) => {
    if (revealed[id]) return;
    setRevealing(id);
    try {
      const { data, error } = await supabase.functions.invoke("card-provision", {
        body: { action: "reveal", card_id: id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const d = data as any;
      setRevealed((r) => ({ ...r, [id]: { number: d.card_number, cvv: d.cvv } }));
    } catch (e: any) {
      toast.error(e.message || "Could not reveal");
    } finally {
      setRevealing(null);
    }
  };

  const balance = Number(profile?.balance || 0);

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Virtual Cards</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Spin up beautiful virtual cards backed by your TradeLux balance.
          </p>
        </div>
        <Button onClick={() => setPurchaseOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Issue new card ($20)
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : cards.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">You don't have a virtual card yet</p>
          <p className="text-sm text-muted-foreground mt-1">Issue your first card for $20 and start spending instantly.</p>
          <Button className="mt-4" onClick={() => setPurchaseOpen(true)}>Issue first card</Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.id} className="glass-card-hover p-5 space-y-4 animate-fade-in">
              <VirtualCardVisual
                brand={c.brand}
                last4={c.last4}
                cardholder={c.cardholder_name}
                expMonth={c.expiry_month}
                expYear={c.expiry_year}
                balance={c.balance}
                status={c.status}
                design={c.design}
                fullNumber={revealed[c.id]?.number}
                cvv={revealed[c.id]?.cvv}
                onRequestReveal={() => reveal(c.id)}
                revealing={revealing === c.id}
              />
              <div className="flex items-center justify-between text-xs">
                <Badge variant={c.status === "active" ? "default" : c.status === "suspended" ? "destructive" : "secondary"}>
                  {c.status.toUpperCase()}
                </Badge>
                <span className="text-muted-foreground">Issued {new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" disabled={c.status !== "active"}
                  onClick={() => { setLoadOpen({ id: c.id, mode: "load" }); setAmount(""); }}>
                  <ArrowDownToLine className="w-4 h-4 mr-1" /> Load
                </Button>
                <Button size="sm" variant="outline" disabled={c.status !== "active" || Number(c.balance) <= 0}
                  onClick={() => { setLoadOpen({ id: c.id, mode: "unload" }); setAmount(""); }}>
                  <ArrowUpFromLine className="w-4 h-4 mr-1" /> Withdraw
                </Button>
                {c.status === "active" ? (
                  <Button size="sm" variant="destructive" className="col-span-2"
                    onClick={() => setStatus.mutate({ id: c.id, status: "blocked" })}>
                    <Ban className="w-4 h-4 mr-1" /> Block card
                  </Button>
                ) : c.status === "blocked" ? (
                  <Button size="sm" className="col-span-2"
                    onClick={() => setStatus.mutate({ id: c.id, status: "active" })}>
                    <Unlock className="w-4 h-4 mr-1" /> Unblock card
                  </Button>
                ) : (
                  <p className="col-span-2 text-xs text-center text-muted-foreground py-2">
                    Suspended by admin — contact support.
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {txns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent card activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {txns.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium capitalize">{t.type.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
                <div className="text-right">
                  <p className={cn("font-mono", t.type === "load" ? "text-success" : "text-foreground")}>
                    {t.type === "load" || t.type === "unload" ? "" : "−"}${Number(t.amount).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Purchase Dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue a new virtual card</DialogTitle>
            <DialogDescription>
              A $20 issuance fee will be deducted from your main balance (${balance.toFixed(2)} available).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider">Choose design</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {(Object.keys(CARD_DESIGNS) as CardDesign[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => setSelectedDesign(k)}
                    className={cn(
                      "h-16 rounded-lg bg-gradient-to-br ring-2 transition-all",
                      CARD_DESIGNS[k].front,
                      selectedDesign === k ? "ring-primary scale-105" : "ring-transparent opacity-70 hover:opacity-100",
                    )}
                  >
                    <span className="text-white text-xs font-semibold drop-shadow">{CARD_DESIGNS[k].name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchaseOpen(false)}>Cancel</Button>
            <Button onClick={() => purchase.mutate()} disabled={purchase.isPending || balance < 20}>
              {purchase.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Pay $20 & issue card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load/Unload Dialog */}
      <Dialog open={!!loadOpen} onOpenChange={(o) => !o && setLoadOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{loadOpen?.mode === "load" ? "Load card" : "Withdraw to balance"}</DialogTitle>
            <DialogDescription>
              {loadOpen?.mode === "load"
                ? `Move funds from your main balance ($${balance.toFixed(2)}) onto the card.`
                : "Move funds from the card back to your main balance."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="amt">Amount (USD)</Label>
            <Input id="amt" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadOpen(null)}>Cancel</Button>
            <Button
              onClick={() => loadOpen && moveFunds.mutate({ id: loadOpen.id, mode: loadOpen.mode, value: Number(amount) })}
              disabled={moveFunds.isPending || !amount || Number(amount) <= 0}
            >
              {moveFunds.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CardsPage;
