import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, History, Sparkles, Copy, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import DepositCountdown from "@/components/DepositCountdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { useCryptoAddresses, useAdminSettings } from "@/hooks/useAdminSettings";
import { toast } from "sonner";

type Mode = "deposit" | "withdraw";
type HistTab = "deposits" | "withdrawals";

const WalletPage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("deposit");
  const [histTab, setHistTab] = useState<HistTab>("deposits");

  // Deposit state
  const [amount, setAmount] = useState("");
  const [txid, setTxid] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [activeDeposit, setActiveDeposit] = useState<any>(null);

  // Withdraw state
  const [wAmount, setWAmount] = useState("");
  const [wAddr, setWAddr] = useState("");
  const [wNetwork, setWNetwork] = useState("TRC20");

  const { data: addresses = [] } = useCryptoAddresses();
  const { data: settings } = useAdminSettings();
  const depositsEnabled = settings?.deposits_enabled ?? true;
  const withdrawalsEnabled = settings?.withdrawals_enabled ?? true;
  const countdownMinutes = settings?.deposit_countdown_minutes ?? 30;

  const { data: deposits = [] } = useQuery({
    queryKey: ["wallet-deposits", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*, crypto_addresses(address, network, currency)").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["wallet-withdrawals", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  const balance = profile?.balance ? parseFloat(profile.balance as any) : 0;
  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId) || addresses[0];
  const list = histTab === "deposits" ? deposits : withdrawals;

  const sendEmail = async (template: string, data: any) => {
    if (!profile?.email) return;
    try {
      await supabase.functions.invoke("send-email", {
        body: { to: profile.email, template, data: { name: profile.first_name, ...data }, origin: window.location.origin },
      });
    } catch (e) { console.error(e); }
  };

  const createDeposit = useMutation({
    mutationFn: async () => {
      if (!selectedAddress) throw new Error("No deposit address available");
      const expiresAt = new Date(Date.now() + countdownMinutes * 60 * 1000).toISOString();
      const { data, error } = await supabase.from("deposits").insert({
        user_id: user!.id, amount: parseFloat(amount), crypto_address_id: selectedAddress.id,
        network: selectedAddress.network, currency: selectedAddress.currency, expires_at: expiresAt,
      }).select("*, crypto_addresses(address, network, currency)").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setActiveDeposit(d); toast.success("Deposit session started"); queryClient.invalidateQueries({ queryKey: ["wallet-deposits"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitTxid = useMutation({
    mutationFn: async () => {
      if (!activeDeposit) return;
      const { error } = await supabase.from("deposits").update({ txid, status: "pending" as any }).eq("id", activeDeposit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Submitted! Awaiting confirmation");
      sendEmail("deposit_received", { amount: activeDeposit.amount, network: activeDeposit.network, txid });
      setActiveDeposit(null); setTxid(""); setAmount("");
      queryClient.invalidateQueries({ queryKey: ["wallet-deposits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitWithdrawal = useMutation({
    mutationFn: async () => {
      const n = parseFloat(wAmount);
      if (n <= 0) throw new Error("Invalid amount");
      if (n > balance) throw new Error("Insufficient balance");
      const { error } = await supabase.from("withdrawals").insert({ user_id: user!.id, amount: n, wallet_address: wAddr, network: wNetwork });
      if (error) throw error;
      return n;
    },
    onSuccess: (n) => {
      toast.success("Withdrawal submitted!");
      sendEmail("withdrawal_requested", { amount: n, network: wNetwork, wallet_address: wAddr });
      setWAmount(""); setWAddr("");
      queryClient.invalidateQueries({ queryKey: ["wallet-withdrawals"] });
      refreshProfile();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copied!"); };
  const qrUrl = (a: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(a)}&bgcolor=0a0d14&color=EAB308`;

  return (
    <div className="p-4 md:p-8 space-y-5 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">{t("wallet.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("wallet.subtitle")}</p>
      </div>

      {/* HERO Balance + persistent action toggle */}
      <div className="relative overflow-hidden glass-card p-6 md:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(43,96%,56%,0.15),transparent_60%)] pointer-events-none" />
        <div className="relative space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl gold-gradient flex items-center justify-center shrink-0 shadow-gold-glow">
                <WalletIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("wallet.available")}</p>
                <p className="text-3xl md:text-4xl font-display font-bold gold-text leading-tight">
                  ${balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-primary/60 shrink-0" />
          </div>

          {/* Persistent toggle: Deposit | Withdraw — content swaps below, no route change */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setMode("deposit")}
              className={`h-14 text-base flex-col gap-0.5 font-semibold transition-all ${
                mode === "deposit"
                  ? "gold-gradient text-primary-foreground shadow-gold-glow"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border"
              }`}
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span>{t("wallet.deposit")}</span>
            </Button>
            <Button
              onClick={() => setMode("withdraw")}
              className={`h-14 text-base flex-col gap-0.5 font-semibold transition-all ${
                mode === "withdraw"
                  ? "gold-gradient text-primary-foreground shadow-gold-glow"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border"
              }`}
            >
              <ArrowUpRight className="w-5 h-5" />
              <span>{t("wallet.withdraw")}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Action panel — content changes inline */}
      <div className="glass-card p-4 md:p-6">
        {mode === "deposit" ? (
          !depositsEnabled ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Deposits are temporarily disabled.</p>
            </div>
          ) : !activeDeposit ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> New Deposit
              </h3>
              {addresses.length > 0 ? (
                <div className="space-y-2">
                  <Label>Network</Label>
                  <select value={selectedAddressId || addresses[0]?.id} onChange={(e) => setSelectedAddressId(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
                    {addresses.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.currency} ({a.network}) {a.label ? `- ${a.label}` : ""}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-warning p-3 rounded-lg bg-warning/10 border border-warning/20">No deposit addresses configured.</p>
              )}
              <div className="space-y-2">
                <Label>Amount (USDT)</Label>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary/50 border-border focus:border-primary" />
              </div>
              <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11" disabled={!amount || addresses.length === 0 || createDeposit.isPending} onClick={() => createDeposit.mutate()}>
                {createDeposit.isPending ? "Starting..." : "Start Deposit"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <DepositCountdown expiresAt={activeDeposit.expires_at} onExpired={() => setActiveDeposit(null)} />
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-3">
                  Send <span className="text-primary font-bold">${parseFloat(activeDeposit.amount).toLocaleString()}</span> {activeDeposit.currency} ({activeDeposit.network})
                </p>
                <img src={qrUrl(activeDeposit.crypto_addresses?.address || "")} alt="QR" className="w-44 h-44 rounded-lg border border-border" />
                <div className="flex items-center gap-2 mt-3 w-full">
                  <code className="flex-1 text-xs font-mono text-primary break-all bg-background/50 p-2 rounded">{activeDeposit.crypto_addresses?.address}</code>
                  <Button size="icon" variant="ghost" onClick={() => copy(activeDeposit.crypto_addresses?.address)} className="shrink-0 hover:bg-primary/10"><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Transaction ID (TXID)</Label>
                <Input placeholder="Paste TXID after sending" value={txid} onChange={(e) => setTxid(e.target.value)} className="bg-secondary/50 border-border focus:border-primary font-mono text-xs" />
              </div>
              <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11" disabled={!txid || submitTxid.isPending} onClick={() => submitTxid.mutate()}>
                {submitTxid.isPending ? "Submitting..." : "Submit TXID"}
              </Button>
            </div>
          )
        ) : (
          !withdrawalsEnabled ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Withdrawals are temporarily disabled.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-primary" /> New Withdrawal</h3>
              <div className="space-y-2">
                <Label>Amount (USDT)</Label>
                <Input type="number" placeholder="0.00" value={wAmount} onChange={(e) => setWAmount(e.target.value)} className="bg-secondary/50 border-border focus:border-primary" />
              </div>
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input placeholder="Your wallet address" value={wAddr} onChange={(e) => setWAddr(e.target.value)} className="bg-secondary/50 border-border focus:border-primary font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Network</Label>
                <select value={wNetwork} onChange={(e) => setWNetwork(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
                  <option value="TRC20">USDT (TRC20)</option>
                  <option value="ERC20">USDT (ERC20)</option>
                  <option value="BEP20">USDT (BEP20)</option>
                </select>
              </div>
              <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11" disabled={!wAmount || !wAddr || submitWithdrawal.isPending} onClick={() => submitWithdrawal.mutate()}>
                {submitWithdrawal.isPending ? "Submitting..." : "Submit Withdrawal"}
              </Button>
            </div>
          )
        )}
      </div>

      {/* History */}
      <div className="glass-card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Transaction History</h3>
        </div>
        <div className="flex gap-1 mb-4 p-1 bg-secondary/40 rounded-lg">
          <button onClick={() => setHistTab("deposits")} className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${histTab === "deposits" ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t("wallet.deposits")} ({deposits.length})
          </button>
          <button onClick={() => setHistTab("withdrawals")} className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${histTab === "withdrawals" ? "bg-primary/20 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t("wallet.withdrawals")} ({withdrawals.length})
          </button>
        </div>
        <div className="space-y-2">
          {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t("wallet.noHistory", { type: t(`wallet.${histTab}`) })}</p>}
          {list.map((item: any) => {
            const isWd = histTab === "withdrawals";
            const Icon = isWd ? ArrowUpRight : ArrowDownLeft;
            const status = item.status;
            const iconBg = status === "confirmed" || status === "completed" || status === "approved"
              ? "bg-success/10 text-success"
              : status === "pending" || status === "processing"
              ? "bg-warning/10 text-warning"
              : "bg-destructive/10 text-destructive";
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">${parseFloat(item.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted-foreground truncate">{new Date(item.created_at).toLocaleString()} · {item.network}</p>
                  </div>
                </div>
                <StatusBadge status={status === "completed" ? "confirmed" : status === "approved" ? "active" : status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
