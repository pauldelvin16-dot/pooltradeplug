import { useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { 
  Users, BarChart3, Wallet, Trophy, Settings, Shield, Eye, 
  MessageSquare, Bot, ArrowUpRight, Home, LogOut, Menu
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "@/components/admin/AdminSidebar";

const AdminPanel = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border bg-card/90 backdrop-blur-xl px-4 sticky top-0 z-50">
            <SidebarTrigger className="mr-3" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="font-semibold text-sm md:text-base">Admin Panel</h1>
            </div>
            <span className="ml-auto text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">Admin</span>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;
