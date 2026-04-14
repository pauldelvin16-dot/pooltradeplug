import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: allProfiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*, user_roles(role)");
      return data || [];
    },
  });

  const updateBalance = useMutation({
    mutationFn: async ({ userId, balance }: { userId: string; balance: number }) => {
      const { error } = await supabase.from("profiles").update({ balance }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Balance updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
  });

  const filtered = allProfiles.filter((p: any) => 
    `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">User Management</h2>
        <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64 bg-secondary/50 border-border" />
      </div>
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 font-medium">User</th>
                <th className="text-left py-3 px-4 font-medium">Role</th>
                <th className="text-left py-3 px-4 font-medium">Balance</th>
                <th className="text-left py-3 px-4 font-medium">Telegram</th>
                <th className="text-left py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-secondary/30">
                  <td className="py-3 px-4">
                    <p className="font-medium">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {(p.user_roles as any)?.[0]?.role || "user"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">${parseFloat(p.balance).toLocaleString()}</td>
                  <td className="py-3 px-4">{p.telegram_linked ? "✓ Linked" : "—"}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Set balance"
                        className="w-28 h-8 text-xs bg-secondary/50 border-border"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = parseFloat((e.target as HTMLInputElement).value);
                            if (!isNaN(val)) updateBalance.mutate({ userId: p.user_id, balance: val });
                          }
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
