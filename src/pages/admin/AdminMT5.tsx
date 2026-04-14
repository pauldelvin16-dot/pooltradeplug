import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "sonner";

const AdminMT5 = () => {
  const queryClient = useQueryClient();

  const { data: allMt5 = [] } = useQuery({
    queryKey: ["admin-mt5"],
    queryFn: async () => {
      const { data } = await supabase.from("mt5_accounts").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateMt5Status = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("mt5_accounts").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("MT5 status updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-mt5"] });
    },
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h2 className="text-xl font-display font-bold">MT5 Account Management</h2>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 font-medium">Login</th>
                <th className="text-left py-3 px-4 font-medium">Server</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allMt5.map((acc: any) => (
                <tr key={acc.id} className="hover:bg-secondary/30">
                  <td className="py-3 px-4 font-mono text-xs">{acc.mt5_login}</td>
                  <td className="py-3 px-4 text-xs">{acc.mt5_server || "—"}</td>
                  <td className="py-3 px-4"><StatusBadge status={acc.status === "pending_review" ? "pending" : acc.status === "active" ? "assigned" : acc.status} /></td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      {acc.status === "pending_review" && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-success" onClick={() => updateMt5Status.mutate({ id: acc.id, status: "active" })}>Activate</Button>
                      )}
                      {acc.status === "active" && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateMt5Status.mutate({ id: acc.id, status: "disabled" })}>Disable</Button>
                      )}
                      {acc.status === "disabled" && (
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-success" onClick={() => updateMt5Status.mutate({ id: acc.id, status: "active" })}>Enable</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {allMt5.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No MT5 accounts yet</p>}
      </div>
    </div>
  );
};

export default AdminMT5;
