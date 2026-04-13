import { useState } from "react";
import { Copy, CheckCircle, Upload, Clock, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import DepositCountdown from "@/components/DepositCountdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCryptoAddresses, useAdminSettings } from "@/hooks/useAdminSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const DepositsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [txid, setTxid] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [activeDeposit, setActiveDeposit] = useState<any>(null);

  const { data: addresses = [] } = useCryptoAddresses();
  const { data: settings } = useAdminSettings();
  const depositsEnabled = settings?.deposits_enabled ?? true;
  const countdownMinutes = settings?.deposit_countdown_minutes ?? 30;

  const { data: deposits = [] } = useQuery({
    queryKey: ["deposits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deposits")
        .select("*, crypto_addresses(address, network, currency)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedAddress = addresses.find((a: any) => a.id === selectedAddressId) || addresses[0];

  const createDeposit = useMutation({
    mutationFn: async () => {
      if (!selectedAddress) throw new Error("No deposit address available");
      const expiresAt = new Date(Date.now() + countdownMinutes * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("deposits")
        .insert({
          user_id: user!.id,
          amount: parseFloat(amount),
          crypto_address_id: selectedAddress.id,
          network: selectedAddress.network,
          currency: selectedAddress.currency,
          expires_at: expiresAt,
        })
        .select("*, crypto_addresses(address, network, currency)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveDeposit(data);
      toast.success("Deposit session started! Send funds within the time limit.");
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitTxid = useMutation({
    mutationFn: async () => {
      if (!activeDeposit) return;
      const { error } = await supabase
        .from("deposits")
        .update({ txid, status: "pending" as any })
        .eq("id", activeDeposit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("TXID submitted! Awaiting admin confirmation.");
      setActiveDeposit(null);
      setTxid("");
      setAmount("");
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied!");
  };

  const qrUrl = (address: string) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&bgcolor=0a0d14&color=EAB308`;

  if (!depositsEnabled) {
    return (
      <div className="p-4 md:p-8">
        <div className="glass-card p-12 text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Deposits Temporarily Disabled</h2>
          <p className="text-muted-foreground">The admin has temporarily disabled deposits. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Deposits</h1>
        <p className="text-sm text-muted-foreground mt-1">Deposit crypto to fund your account</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {activeDeposit ? "Complete Your Deposit" : "New Deposit"}
          </h3>

          {!activeDeposit ? (
            <div className="space-y-4">
              {addresses.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Network</Label>
                  <select
                    value={selectedAddressId || addresses[0]?.id}
                    onChange={(e) => setSelectedAddressId(e.target.value)}
                    className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm"
                  >
                    {addresses.map((addr: any) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.currency} ({addr.network}) {addr.label ? `- ${addr.label}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {addresses.length === 0 && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 text-sm text-warning">
                  No deposit addresses configured yet. Please contact admin.
                </div>
              )}

              <div className="space-y-2">
                <Label>Amount (USDT)</Label>
                <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary/50 border-border focus:border-primary" />
              </div>

              <Button
                className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11"
                disabled={!amount || addresses.length === 0 || createDeposit.isPending}
                onClick={() => createDeposit.mutate()}
              >
                {createDeposit.isPending ? "Starting..." : "Start Deposit Session"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Countdown */}
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                <DepositCountdown
                  expiresAt={activeDeposit.expires_at}
                  onExpired={() => setActiveDeposit(null)}
                />
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground mb-3">
                  Send <span className="text-primary font-bold">${parseFloat(activeDeposit.amount).toLocaleString()}</span> {activeDeposit.currency} ({activeDeposit.network})
                </p>
                <img
                  src={qrUrl(activeDeposit.crypto_addresses?.address || "")}
                  alt="Deposit QR Code"
                  className="w-48 h-48 rounded-lg border border-border"
                />
                <div className="flex items-center gap-2 mt-3 w-full">
                  <code className="flex-1 text-xs font-mono text-primary break-all bg-background/50 p-2 rounded">
                    {activeDeposit.crypto_addresses?.address}
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => copyAddress(activeDeposit.crypto_addresses?.address)} className="shrink-0 hover:bg-primary/10">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
                ⚠️ Only send {activeDeposit.currency} on the {activeDeposit.network} network. Sending other tokens will result in permanent loss.
              </div>

              {/* TXID submission */}
              <div className="space-y-2">
                <Label>Transaction ID (TXID)</Label>
                <Input placeholder="Paste your TXID after sending" value={txid} onChange={(e) => setTxid(e.target.value)} className="bg-secondary/50 border-border focus:border-primary font-mono text-xs" />
              </div>
              <Button
                className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11"
                disabled={!txid || submitTxid.isPending}
                onClick={() => submitTxid.mutate()}
              >
                {submitTxid.isPending ? "Submitting..." : "Submit TXID"}
              </Button>
            </div>
          )}
        </div>

        {/* History */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Deposit History</h3>
          <div className="space-y-3">
            {deposits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No deposits yet</p>
            )}
            {deposits.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    d.status === "confirmed" ? "bg-success/10" : d.status === "pending" ? "bg-warning/10" : "bg-destructive/10"
                  }`}>
                    {d.status === "confirmed" ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">${parseFloat(d.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()} · {d.network}</p>
                  </div>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositsPage;
