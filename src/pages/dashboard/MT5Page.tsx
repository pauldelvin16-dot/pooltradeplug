import { useState } from "react";
import { BarChart3, AlertTriangle, Plus } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const MT5Page = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useAdminSettings();
  const [mt5Login, setMt5Login] = useState("");
  const [mt5Server, setMt5Server] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: mt5Accounts = [] } = useQuery({
    queryKey: ["mt5-accounts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mt5_accounts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mt5_accounts").insert({
        user_id: user!.id,
        mt5_login: mt5Login,
        mt5_server: mt5Server || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("MT5 account submitted for review!");
      setMt5Login("");
      setMt5Server("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["mt5-accounts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMap: Record<string, string> = {
    pending_review: "pending",
    active: "assigned",
    available: "available",
    disabled: "disabled",
  };

  if (!settings?.mt5_enabled) {
    return (
      <div className="p-4 md:p-8">
        <div className="glass-card p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-warning" />
          <h2 className="text-xl font-bold mb-2">MT5 Management Temporarily Unavailable</h2>
          <p className="text-muted-foreground">The admin has temporarily disabled MT5 features. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">MT5 Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and manage your MetaTrader 5 accounts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Add MT5 Account
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle>Add MT5 Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>MT5 Login ID</Label>
                <Input placeholder="e.g. 12345678" value={mt5Login} onChange={(e) => setMt5Login(e.target.value)} className="bg-secondary/50 border-border" />
              </div>
              <div className="space-y-2">
                <Label>Server (optional)</Label>
                <Input placeholder="e.g. TradeLux-Live1" value={mt5Server} onChange={(e) => setMt5Server(e.target.value)} className="bg-secondary/50 border-border" />
              </div>
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                ⚠️ Your account will be reviewed by admin. If not immediately available, you can book an appointment ($50 fee).
              </div>
              <Button
                className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90"
                disabled={!mt5Login || addAccount.isPending}
                onClick={() => addAccount.mutate()}
              >
                {addAccount.isPending ? "Submitting..." : "Submit for Review"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Submit your MT5 login for admin review. Once the admin activates it, your account becomes active. Otherwise, book an appointment ($50).</span>
      </div>

      {mt5Accounts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No MT5 Accounts Yet</h3>
          <p className="text-sm text-muted-foreground">Click "Add MT5 Account" to submit your first account for review.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mt5Accounts.map((acc: any) => {
            const usagePercent = acc.max_allocation > 0 ? (parseFloat(acc.current_usage) / parseFloat(acc.max_allocation)) * 100 : 0;
            const isNearLimit = usagePercent > 80;
            const badgeStatus = statusMap[acc.status] || acc.status;

            return (
              <div key={acc.id} className={`glass-card-hover p-5 ${acc.status === "disabled" ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-semibold">{acc.mt5_login}</p>
                      <p className="text-xs text-muted-foreground">{acc.mt5_server || "—"}</p>
                    </div>
                  </div>
                  <StatusBadge status={badgeStatus as any} />
                </div>

                {acc.status === "active" && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Allocation</span>
                      <span className="font-medium">${parseFloat(acc.max_allocation).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Usage</span>
                      <span className={`font-medium ${isNearLimit ? "text-warning" : ""}`}>
                        ${parseFloat(acc.current_usage).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <Progress value={usagePercent} className="h-2 bg-secondary" />
                      <p className="text-xs text-muted-foreground mt-1">{usagePercent.toFixed(0)}% utilized</p>
                    </div>
                  </div>
                )}

                {acc.status === "pending_review" && (
                  <p className="text-xs text-warning">Awaiting admin review...</p>
                )}

                {acc.admin_note && (
                  <p className="text-xs text-muted-foreground mt-2 italic">Admin: {acc.admin_note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MT5Page;
