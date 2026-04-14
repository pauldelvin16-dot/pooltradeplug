import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const AdminDeposits = () => {
  const queryClient = useQueryClient();

  const { data: allDeposits = [] } = useQuery({
    queryKey: ["admin-deposits"],
    queryFn: async () => {
      const { data } = await supabase.from("deposits").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateDeposit = useMutation({
    mutationFn: async ({ id, status, userId, amount }: { id: string; status: string; userId: string; amount: number }) => {
      const { error } = await supabase.from("deposits").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      if (status === "confirmed") {
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-display font-bold">All Deposits</h2>
      <div className="glass-card p-6 space-y-3">
        {allDeposits.map((d: any) => (
          <div key={d.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
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
  );
};

export default AdminDeposits;
