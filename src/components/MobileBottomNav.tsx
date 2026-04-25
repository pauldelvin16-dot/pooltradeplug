import { Home, Wallet, BarChart3, Users, MessageCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  // Check if user is in any full active pool (chat unlock)
  const { data: chatUnlocked = false } = useQuery({
    queryKey: ["mobile-chat-unlock", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data: parts } = await supabase
        .from("pool_participants").select("pool_id").eq("user_id", user.id);
      if (!parts || parts.length === 0) return false;
      const ids = parts.map((p: any) => p.pool_id);
      const { data: pools } = await supabase
        .from("pools").select("id, current_participants, max_participants, status")
        .in("id", ids).eq("status", "active");
      return !!pools?.some((p: any) => p.current_participants >= p.max_participants);
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/dashboard" },
    { icon: Wallet, label: t("nav.wallet"), path: "/dashboard/wallet" },
    { icon: Users, label: t("nav.pools"), path: "/dashboard/pools" },
    {
      icon: MessageCircle,
      label: t("nav.chat"),
      path: "/dashboard/chat",
      locked: !chatUnlocked,
    },
    { icon: BarChart3, label: t("nav.mt5"), path: "/dashboard/mt5" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 px-1 safe-area-bottom">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path === "/dashboard/wallet" &&
              (location.pathname === "/dashboard/deposits" ||
                location.pathname === "/dashboard/withdrawals"));
          const isLocked = (item as any).locked;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : isLocked
                  ? "text-muted-foreground/60"
                  : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "drop-shadow-[0_0_8px_hsla(43,96%,56%,0.5)]" : ""
                  }`}
                />
                {item.path === "/dashboard/chat" && !isLocked && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-success animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
