import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const AdminWithdrawals = () => {
  const queryClient = useQueryClient();

  const { data: allWithdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data } = await supabase.from("withdrawals").select("*").order("created_at", { ascending: false });
      return data || [];
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-display font-bold">All Withdrawals</h2>
      <div className="glass-card p-6 space-y-3">
        {allWithdrawals.map((w: any) => (
          <div key={w.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
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
  );
};

export default AdminWithdrawals;
