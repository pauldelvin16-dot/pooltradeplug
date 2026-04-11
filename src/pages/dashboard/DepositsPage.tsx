import { useState } from "react";
import { Copy, CheckCircle, Upload, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";

const ADMIN_WALLET = "TXqH7sW...demoAddress...abc123";

const depositHistory = [
  { id: "DEP-001", amount: "$5,000", status: "confirmed" as const, date: "2026-04-10", txid: "abc123...xyz" },
  { id: "DEP-002", amount: "$2,500", status: "pending" as const, date: "2026-04-09", txid: "def456...uvw" },
  { id: "DEP-003", amount: "$1,000", status: "rejected" as const, date: "2026-04-07", txid: "ghi789...rst" },
];

const DepositsPage = () => {
  const [txid, setTxid] = useState("");
  const [amount, setAmount] = useState("");

  const copyAddress = () => {
    navigator.clipboard.writeText(ADMIN_WALLET);
    toast.success("Wallet address copied!");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Deposits</h1>
        <p className="text-sm text-muted-foreground mt-1">Deposit USDT (TRC20) to fund your account</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Deposit Form */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            New Deposit
          </h3>

          {/* Wallet Address */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Send USDT (TRC20) to this address:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-primary break-all">{ADMIN_WALLET}</code>
              <Button size="icon" variant="ghost" onClick={copyAddress} className="shrink-0 hover:bg-primary/10">
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
            ⚠️ Only send USDT on the TRC20 network. Sending other tokens will result in permanent loss.
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (USDT)</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary/50 border-border focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label>Transaction ID (TXID)</Label>
              <Input placeholder="Paste your TXID here" value={txid} onChange={(e) => setTxid(e.target.value)} className="bg-secondary/50 border-border focus:border-primary font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Proof (optional)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/30 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload screenshot</p>
              </div>
            </div>
            <Button className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11" disabled={!amount || !txid}>
              Submit Deposit Request
            </Button>
          </div>
        </div>

        {/* History */}
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Deposit History</h3>
          <div className="space-y-3">
            {depositHistory.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    d.status === "confirmed" ? "bg-success/10" : d.status === "pending" ? "bg-warning/10" : "bg-destructive/10"
                  }`}>
                    {d.status === "confirmed" ? <CheckCircle className="w-4 h-4 text-success" /> : <Clock className="w-4 h-4 text-warning" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{d.amount}</p>
                    <p className="text-xs text-muted-foreground">{d.date}</p>
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
