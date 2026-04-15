import { Home, Wallet, BarChart3, Users, User, ArrowUpRight } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Wallet, label: "Wallet", path: "/dashboard/deposits" },
  { icon: BarChart3, label: "MT5", path: "/dashboard/mt5" },
  { icon: Users, label: "Pools", path: "/dashboard/pools" },
  { icon: User, label: "Profile", path: "/dashboard/profile" },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  return (
    <>
      {/* Wallet quick menu overlay */}
      {showWalletMenu && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowWalletMenu(false)}>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="glass-card p-2 space-y-1 border border-border">
              <button
                onClick={() => { navigate("/dashboard/deposits"); setShowWalletMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
              >
                <Wallet className="w-4 h-4 text-primary" /> Deposit
              </button>
              <button
                onClick={() => { navigate("/dashboard/withdrawals"); setShowWalletMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm hover:bg-secondary/50 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-primary" /> Withdraw
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/90 backdrop-blur-xl">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === "/dashboard/deposits" && location.pathname === "/dashboard/withdrawals");
            const isWallet = item.label === "Wallet";

            return (
              <button
                key={item.path}
                onClick={() => {
                  if (isWallet) {
                    setShowWalletMenu(!showWalletMenu);
                  } else {
                    setShowWalletMenu(false);
                    navigate(item.path);
                  }
                }}
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
    </>
  );
};

export default MobileBottomNav;
