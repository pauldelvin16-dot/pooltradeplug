import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield, TrendingUp, Users, Zap, BarChart3, Lock, Gift, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const features = [
  { icon: BarChart3, title: "MT5 Management", desc: "Enterprise-grade MetaTrader 5 account management with real-time monitoring" },
  { icon: Shield, title: "Bank-Grade Security", desc: "Advanced encryption, 2FA, and audit trails to protect your assets" },
  { icon: Users, title: "Pool Trading", desc: "Join exclusive trading pools with verified traders and shared profits" },
  { icon: Zap, title: "Instant Deposits", desc: "USDT TRC20 deposits with instant confirmation and auto-crediting" },
  { icon: TrendingUp, title: "AI Insights", desc: "Smart analytics and trading insights powered by advanced algorithms" },
  { icon: Lock, title: "Full Control", desc: "Granular permissions, limits, and admin controls for every account" },
];

const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: settings } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("*").limit(1).maybeSingle();
      return data;
    },
  });

  const s = settings as any;
  const stats = [
    { label: "Active Traders", value: s?.stat_active_traders || "12,840+" },
    { label: "Total Volume", value: s?.stat_total_volume || "$284M+" },
    { label: "Trading Pools", value: s?.stat_trading_pools || "156" },
    { label: "Uptime", value: s?.stat_uptime || "99.99%" },
  ];

  const bonusEnabled = s?.first_deposit_bonus_enabled;
  const bonusMin = s?.first_deposit_min_amount;
  const bonusAmount = s?.first_deposit_bonus_amount;

  return (
    <div className="min-h-screen">
      <PWAInstallPrompt />

      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <h1 className="text-xl font-display font-bold gold-text">TradeLux</h1>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#pools" className="hover:text-foreground transition-colors">Pools</a>
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher compact />
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground hidden sm:inline-flex">
              {t("nav.signin")}
            </Button>
            <Button size="sm" onClick={() => navigate("/signup")} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
              {t("nav.getStarted")}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsla(43,96%,56%,0.08),transparent_60%)]" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Trading Platform
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight text-balance">
              Trade Smarter with{" "}
              <span className="gold-text">Elite Access</span>
            </h2>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              The world-class trading management platform. MT5 accounts, pool trading, USDT deposits — all in one secure, luxurious experience.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Button size="lg" onClick={() => navigate("/signup")} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 px-8 h-12">
                Start Trading <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="border-border hover:border-primary/30 hover:bg-primary/5 px-8 h-12">
                Sign In
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto animate-fade-in">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-4 text-center">
                <p className="text-2xl font-bold gold-text">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* First Deposit Bonus Banner */}
      {bonusEnabled && (
        <section className="py-8 border-t border-border/50">
          <div className="container">
            <div className="glass-card p-8 text-center max-w-2xl mx-auto border border-primary/20 bg-primary/5 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsla(43,96%,56%,0.08),transparent_70%)]" />
              <div className="relative">
                <Gift className="w-12 h-12 mx-auto mb-3 text-primary" />
                <h3 className="text-2xl font-display font-bold mb-2">🎉 First Deposit Bonus!</h3>
                <p className="text-muted-foreground mb-4">
                  Deposit <span className="text-primary font-bold">${bonusMin}+</span> and receive a{" "}
                  <span className="text-primary font-bold">${bonusAmount} bonus</span> credited instantly to your account!
                </p>
                <Button size="lg" onClick={() => navigate("/signup")} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90">
                  Claim Your Bonus <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-20 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-display font-bold">
              Everything You Need to <span className="gold-text">Succeed</span>
            </h3>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Built for professional traders who demand the best tools and security.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((f) => (
              <div key={f.title} className="glass-card-hover p-6 group">
                <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center mb-4 group-hover:shadow-gold-glow transition-shadow">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h4 className="font-semibold mb-2">{f.title}</h4>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/50">
        <div className="container">
          <div className="glass-card p-10 md:p-16 text-center max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsla(43,96%,56%,0.06),transparent_70%)]" />
            <div className="relative">
              <h3 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Ready to <span className="gold-text">Elevate</span> Your Trading?
              </h3>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join thousands of elite traders and start managing your portfolio with world-class tools.
              </p>
              <Button size="lg" onClick={() => navigate("/signup")} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 px-8 h-12">
                Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="font-display gold-text font-bold">TradeLux</p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Terms</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Privacy</button>
            <button onClick={() => navigate("/risk")} className="hover:text-foreground transition-colors">Risk Disclosure</button>
          </div>
          <p>© 2026 TradeLux. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
