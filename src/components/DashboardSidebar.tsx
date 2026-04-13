import { Home, Wallet, BarChart3, Users, User, Settings, Shield, LogOut, TrendingUp, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const menuItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Wallet, label: "Deposits", path: "/dashboard/deposits" },
  { icon: ArrowUpRight, label: "Withdrawals", path: "/dashboard/withdrawals" },
  { icon: BarChart3, label: "MT5 Accounts", path: "/dashboard/mt5" },
  { icon: Users, label: "Pool Trading", path: "/dashboard/pools" },
  { icon: TrendingUp, label: "Analytics", path: "/dashboard/analytics" },
  { icon: User, label: "Profile", path: "/dashboard/profile" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, signOut, profile } = useAuth();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r border-border bg-sidebar sticky top-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-display font-bold gold-text cursor-pointer" onClick={() => navigate("/")}>
          TradeLux
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Trader" : "Elite Trading Platform"}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-1">
        {/* Balance display */}
        {profile && (
          <div className="px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-bold gold-text">
              ${parseFloat(profile.balance || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Shield className="w-4 h-4" />
            Admin Panel
          </button>
        )}
        <button
          onClick={async () => { await signOut(); navigate("/"); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
