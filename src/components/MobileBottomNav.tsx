import { useState } from "react";
import { Home, Wallet, BarChart3, Users, User, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Wallet, label: "Wallet", path: "/dashboard/wallet" },
  { icon: BarChart3, label: "MT5", path: "/dashboard/mt5" },
  { icon: Users, label: "Pools", path: "/dashboard/pools" },
  { icon: User, label: "Profile", path: "/dashboard/profile" },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/90 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/dashboard/wallet" &&
              (location.pathname === "/dashboard/deposits" || location.pathname === "/dashboard/withdrawals"));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_hsla(43,96%,56%,0.5)]" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
