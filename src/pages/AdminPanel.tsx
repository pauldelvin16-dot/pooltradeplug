import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, BarChart3, Wallet, Trophy, Settings, ArrowLeft, Shield, Eye, Ban, CheckCircle, XCircle, ToggleLeft, ToggleRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import { toast } from "sonner";

type Tab = "overview" | "users" | "mt5" | "deposits" | "pools" | "settings";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Eye },
  { key: "users", label: "Users", icon: Users },
  { key: "mt5", label: "MT5", icon: BarChart3 },
  { key: "deposits", label: "Deposits", icon: Wallet },
  { key: "pools", label: "Pools", icon: Trophy },
  { key: "settings", label: "Settings", icon: Settings },
];

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-semibold">Admin Panel</h1>
            </div>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">Admin</span>
        </div>
      </header>

      <div className="container py-6">
        {/* Tab Nav */}
        <div className="flex gap-1 overflow-x-auto pb-4 mb-6 border-b border-border scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} title="Total Users" value="12,840" change="+234 this week" changeType="positive" />
              <StatCard icon={Wallet} title="Total Deposits" value="$2.4M" change="+$180K this month" changeType="positive" />
              <StatCard icon={BarChart3} title="Active MT5" value="48" change="12 available" changeType="neutral" />
              <StatCard icon={Trophy} title="Active Pools" value="8" change="3 completing soon" changeType="neutral" />
            </div>
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">User Management</h3>
              <Input placeholder="Search users..." className="w-48 bg-secondary/50 border-border text-sm" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-3 font-medium">User</th>
                    <th className="text-left py-3 font-medium">Role</th>
                    <th className="text-left py-3 font-medium">Balance</th>
                    <th className="text-left py-3 font-medium">Status</th>
                    <th className="text-left py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    { name: "John Doe", email: "john@ex.com", role: "Trader", balance: "$24,580", status: "active" },
                    { name: "Jane Smith", email: "jane@ex.com", role: "User", balance: "$8,200", status: "active" },
                    { name: "Bob Wilson", email: "bob@ex.com", role: "Manager", balance: "$45,000", status: "active" },
                  ].map((u) => (
                    <tr key={u.email} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3">
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </td>
                      <td className="py-3">{u.role}</td>
                      <td className="py-3">{u.balance}</td>
                      <td className="py-3"><StatusBadge status={u.status as any} /></td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-xs h-7"><Eye className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"><Ban className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MT5 Admin */}
        {activeTab === "mt5" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">MT5 Account Management</h3>
              <Button size="sm" className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">+ Add Account</Button>
            </div>
            <div className="glass-card p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-3 font-medium">Account</th>
                      <th className="text-left py-3 font-medium">Assigned To</th>
                      <th className="text-left py-3 font-medium">Limit</th>
                      <th className="text-left py-3 font-medium">Status</th>
                      <th className="text-left py-3 font-medium">Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      { id: "MT5-4821", user: "John Doe", limit: "$10,000", status: "assigned" as const, enabled: true },
                      { id: "MT5-7392", user: "—", limit: "$25,000", status: "available" as const, enabled: true },
                      { id: "MT5-1058", user: "—", limit: "$5,000", status: "disabled" as const, enabled: false },
                    ].map((a) => (
                      <tr key={a.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="py-3 font-mono text-xs">{a.id}</td>
                        <td className="py-3">{a.user}</td>
                        <td className="py-3">{a.limit}</td>
                        <td className="py-3"><StatusBadge status={a.status} /></td>
                        <td className="py-3">
                          <button className="text-muted-foreground hover:text-foreground">
                            {a.enabled ? <ToggleRight className="w-5 h-5 text-success" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Deposits Admin */}
        {activeTab === "deposits" && (
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-4">Pending Deposits</h3>
            <div className="space-y-3">
              {[
                { id: "DEP-045", user: "John Doe", amount: "$5,000", txid: "abc123xyz", date: "2 min ago" },
                { id: "DEP-044", user: "Jane Smith", amount: "$2,500", txid: "def456uvw", date: "1 hr ago" },
              ].map((d) => (
                <div key={d.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg bg-secondary/30 gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium">{d.user}</p>
                      <StatusBadge status="pending" />
                    </div>
                    <p className="text-lg font-bold gold-text">{d.amount}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">TXID: {d.txid}</p>
                    <p className="text-xs text-muted-foreground">{d.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-success/10 text-success border border-success/20 hover:bg-success/20">
                      <CheckCircle className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">
                      <XCircle className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pools Admin */}
        {activeTab === "pools" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pool Management</h3>
              <Button size="sm" className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">+ Create Pool</Button>
            </div>
            <div className="glass-card p-6">
              <p className="text-sm text-muted-foreground">Create and manage trading pools, set targets, entry amounts, and participant limits. Pool results are distributed automatically.</p>
            </div>
          </div>
        )}

        {/* Admin Settings */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-xl">
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold">USDT Wallet Address (TRC20)</h3>
              <p className="text-sm text-muted-foreground">Users will send deposits to this address.</p>
              <div className="flex gap-2">
                <Input defaultValue="TXqH7sW...demoAddress...abc123" className="bg-secondary/50 border-border font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => toast.success("Saved!")} className="shrink-0">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="glass-card p-6 space-y-4">
              <h3 className="font-semibold">Platform Controls</h3>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm">MT5 Management</p>
                  <p className="text-xs text-muted-foreground">Enable/disable MT5 features platform-wide</p>
                </div>
                <button className="text-success"><ToggleRight className="w-6 h-6" /></button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm">Pool Trading</p>
                  <p className="text-xs text-muted-foreground">Enable/disable pool trading features</p>
                </div>
                <button className="text-success"><ToggleRight className="w-6 h-6" /></button>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm">New Registrations</p>
                  <p className="text-xs text-muted-foreground">Allow new users to sign up</p>
                </div>
                <button className="text-success"><ToggleRight className="w-6 h-6" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
