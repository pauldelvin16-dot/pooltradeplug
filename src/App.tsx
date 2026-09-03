import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import { Web3Provider } from "@/lib/web3/Web3Provider";
import { Web3ErrorBoundary } from "@/lib/web3/Web3ErrorBoundary";
import SiteBranding from "@/components/SiteBranding";

// Route-level code splitting: the landing page ships alone, everything else
// loads on demand so first paint stays fast.
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const DepositsPage = lazy(() => import("./pages/dashboard/DepositsPage"));
const CardsPage = lazy(() => import("./pages/dashboard/CardsPage"));
const WithdrawalsPage = lazy(() => import("./pages/dashboard/WithdrawalsPage"));
const WalletPage = lazy(() => import("./pages/dashboard/WalletPage"));
const ChatPage = lazy(() => import("./pages/dashboard/ChatPage"));
const PoolsPage = lazy(() => import("./pages/dashboard/PoolsPage"));
const ProfilePage = lazy(() => import("./pages/dashboard/ProfilePage"));
const AnalyticsPage = lazy(() => import("./pages/dashboard/AnalyticsPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminDeposits = lazy(() => import("./pages/admin/AdminDeposits"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminPools = lazy(() => import("./pages/admin/AdminPools"));
const AdminCards = lazy(() => import("./pages/admin/AdminCards"));
const AdminChat = lazy(() => import("./pages/admin/AdminChat"));
const AdminTelegram = lazy(() => import("./pages/admin/AdminTelegram"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminWallets = lazy(() => import("./pages/admin/AdminWallets"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const RiskPage = lazy(() => import("./pages/RiskPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Web3ErrorBoundary>
      <Web3Provider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SiteBranding />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
              <Route index element={<DashboardHome />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route path="deposits" element={<DepositsPage />} />
              <Route path="withdrawals" element={<WithdrawalsPage />} />
              <Route path="pools" element={<PoolsPage />} />
              <Route path="cards" element={<CardsPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="deposits" element={<AdminDeposits />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="pools" element={<AdminPools />} />
              <Route path="cards" element={<AdminCards />} />
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </Web3Provider>
      </Web3ErrorBoundary>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
