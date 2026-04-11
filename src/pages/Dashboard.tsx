import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";

const Dashboard = () => {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;
