import { Outlet } from "react-router-dom";
import DashboardSidebar from "@/components/DashboardSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import DashboardTopBar from "@/components/DashboardTopBar";

const Dashboard = () => {
  return (
    <div className="flex min-h-screen">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col pb-20 md:pb-0 min-w-0">
        <DashboardTopBar />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Dashboard;
