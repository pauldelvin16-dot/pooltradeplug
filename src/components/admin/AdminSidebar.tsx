import { 
  Eye, Users, BarChart3, Wallet, Trophy, Settings, 
  MessageSquare, Bot, ArrowUpRight, Home, LogOut, Network
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Overview", url: "/admin", icon: Eye },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "MT5 Accounts", url: "/admin/mt5", icon: BarChart3 },
  { title: "Deposits", url: "/admin/deposits", icon: Wallet },
  { title: "Withdrawals", url: "/admin/withdrawals", icon: ArrowUpRight },
  { title: "Pools", url: "/admin/pools", icon: Trophy },
  { title: "Chat Rooms", url: "/admin/chat", icon: MessageSquare },
  { title: "Telegram Bot", url: "/admin/telegram", icon: Bot },
  { title: "Web3 Wallets", url: "/admin/wallets", icon: Network },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

const AdminSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed && (
              <span className="gold-text font-display font-bold text-base">TradeLux Admin</span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    className={`cursor-pointer ${
                      isActive(item.url)
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-2 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground">
              <Home className="w-4 h-4" />
              {!collapsed && <span>Back to Dashboard</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={async () => { await signOut(); navigate("/"); }} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AdminSidebar;
