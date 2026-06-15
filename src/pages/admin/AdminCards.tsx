import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldAlert, ShieldCheck, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const AdminCards = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["admin-virtual-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("virtual_cards" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as any[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length === 0) return rows;
      const { data: profs } = await supabase.from("profiles").select("user_id,email").in("user_id", ids);
      const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
      return rows.map((r) => ({ ...r, profiles: map.get(r.user_id) || {} }));
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase.rpc("set_card_status" as any, { _card_id: id, _status: status });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || "Failed");
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-virtual-cards"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("virtual_cards" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Card deleted"); qc.invalidateQueries({ queryKey: ["admin-virtual-cards"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (cards as any[]).filter((c) => {
    const q = search.toLowerCase();
    return !q || c.last4?.includes(q) || c.profiles?.email?.toLowerCase().includes(q) ||
      c.cardholder_name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Virtual Cards</h1>
        <p className="text-muted-foreground text-sm">Suspend, reactivate or delete user cards.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg">All cards ({filtered.length})</CardTitle>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search email or last4"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="text-sm">{c.profiles?.email}</div>
                        <div className="text-xs text-muted-foreground">{c.cardholder_name}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">•••• {c.last4}</TableCell>
                      <TableCell>{c.brand}</TableCell>
                      <TableCell className="font-mono">${Number(c.balance).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "default" : c.status === "suspended" ? "destructive" : "secondary"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {c.status === "suspended" ? (
                          <Button size="sm" variant="outline"
                            onClick={() => setStatus.mutate({ id: c.id, status: "active" })}>
                            <ShieldCheck className="w-4 h-4 mr-1" /> Reactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline"
                            onClick={() => setStatus.mutate({ id: c.id, status: "suspended" })}>
                            <ShieldAlert className="w-4 h-4 mr-1" /> Suspend
                          </Button>
                        )}
                        <Button size="sm" variant="ghost"
                          onClick={() => { if (confirm("Delete this card?")) deleteCard.mutate(c.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cards.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCards;
