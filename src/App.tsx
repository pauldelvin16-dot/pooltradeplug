import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import DashboardHome from "./pages/dashboard/DashboardHome";
import DepositsPage from "./pages/dashboard/DepositsPage";
import WithdrawalsPage from "./pages/dashboard/WithdrawalsPage";
import WalletPage from "./pages/dashboard/WalletPage";
import ChatPage from "./pages/dashboard/ChatPage";
import MT5Page from "./pages/dashboard/MT5Page";
import PoolsPage from "./pages/dashboard/PoolsPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import AnalyticsPage from "./pages/dashboard/AnalyticsPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import AdminPanel from "./pages/AdminPanel";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMT5 from "./pages/admin/AdminMT5";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminPools from "./pages/admin/AdminPools";
import AdminChat from "./pages/admin/AdminChat";
import AdminTelegram from "./pages/admin/AdminTelegram";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminWallets from "./pages/admin/AdminWallets";
import { Web3Provider } from "@/lib/web3/Web3Provider";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import RiskPage from "./pages/RiskPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="deposits" element={<DepositsPage />} />
              <Route path="withdrawals" element={<WithdrawalsPage />} />
              <Route path="mt5" element={<MT5Page />} />
              <Route path="pools" element={<PoolsPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="mt5" element={<AdminMT5 />} />
              <Route path="deposits" element={<AdminDeposits />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="pools" element={<AdminPools />} />
              <Route path="chat" element={<AdminChat />} />
              <Route path="telegram" element={<AdminTelegram />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="wallets" element={<AdminWallets />} />
            </Route>
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/risk" element={<RiskPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </Web3Provider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
