import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const WithdrawalsPage = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [network, setNetwork] = useState("TRC20");

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["withdrawals", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitWithdrawal = useMutation({
    mutationFn: async () => {
      const numAmount = parseFloat(amount);
      if (numAmount <= 0) throw new Error("Invalid amount");
      if (profile && numAmount > parseFloat(profile.balance)) throw new Error("Insufficient balance");
      const { error } = await supabase.from("withdrawals").insert({
        user_id: user!.id,
        amount: numAmount,
        wallet_address: walletAddress,
        network,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Withdrawal request submitted!");
      setAmount("");
      setWalletAddress("");
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Withdrawals</h1>
        <p className="text-sm text-muted-foreground mt-1">Withdraw funds to your crypto wallet</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-semibold flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-primary" />
            New Withdrawal
          </h3>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <p className="text-xs text-muted-foreground">Available Balance</p>
            <p className="text-2xl font-bold gold-text">${profile?.balance ? parseFloat(profile.balance).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (USDT)</Label>
              <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-secondary/50 border-border focus:border-primary" />
            </div>
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input placeholder="Your wallet address" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="bg-secondary/50 border-border focus:border-primary font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Network</Label>
              <select value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm">
                <option value="TRC20">USDT (TRC20)</option>
                <option value="ERC20">USDT (ERC20)</option>
                <option value="BEP20">USDT (BEP20)</option>
              </select>
            </div>
            <Button
              className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11"
              disabled={!amount || !walletAddress || submitWithdrawal.isPending}
              onClick={() => submitWithdrawal.mutate()}
            >
              {submitWithdrawal.isPending ? "Submitting..." : "Submit Withdrawal"}
            </Button>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4">Withdrawal History</h3>
          <div className="space-y-3">
            {withdrawals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No withdrawals yet</p>
            )}
            {withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10">
                    <ArrowUpRight className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">${parseFloat(w.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <StatusBadge status={w.status === "completed" ? "confirmed" : w.status === "approved" ? "active" : w.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WithdrawalsPage;
