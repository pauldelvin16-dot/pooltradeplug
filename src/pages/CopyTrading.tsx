import { useNavigate } from "react-router-dom";
import { ArrowRight, Copy, ShieldCheck, Zap, LineChart, Users, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTraders } from "@/hooks/useCopyTrading";
import TraderCard from "@/components/copy/TraderCard";
import CryptoTicker from "@/components/CryptoTicker";
import SiteLogo from "@/components/SiteLogo";
import { Skeleton } from "@/components/ui/skeleton";

const steps = [
  { icon: Users, title: "Pick a trader", desc: "Browse verified traders with public win rates, ROI and drawdown." },
  { icon: SlidersHorizontal, title: "Set your terms", desc: "Choose the amount and copy ratio that matches your risk appetite." },
  { icon: Zap, title: "Trades mirror instantly", desc: "Every position the trader opens is copied to your allocation." },
  { icon: ShieldCheck, title: "Stop any time", desc: "Close your copy position and funds return to your balance." },
];

const CopyTrading = () => {
  const navigate = useNavigate();
  const { data: traders = [], isLoading } = useTraders();

  return (
    <div className="min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex items-center justify-between h-16">
          <button onClick={() => navigate("/")}><SiteLogo className="h-9 w-9" textClassName="text-xl" /></button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="hidden sm:inline-flex">Sign In</Button>
            <Button size="sm" onClick={() => navigate("/signup")} className="gold-gradient text-primary-foreground font-semibold">Start Copying</Button>
          </div>
        </div>
        <CryptoTicker />
      </header>

      <section className="relative pt-32 md:pt-40 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsla(43,96%,56%,0.10),transparent_60%)]" />
        <div className="container relative text-center max-w-3xl mx-auto animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Copy className="w-3.5 h-3.5" /> Copy Trading
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight text-balance">
            Trade like the pros — <span className="gold-text">automatically</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground text-balance">
            Follow verified traders and every position they take is mirrored into your account, scaled to the amount you allocate.
            No charts to watch, no manual entries.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <Button size="lg" onClick={() => navigate("/signup")} className="gold-gradient text-primary-foreground font-semibold px-8 h-12">
              Start Copy Trading <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="px-8 h-12">I already have an account</Button>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/50">
        <div className="container">
          <h2 className="text-3xl font-display font-bold text-center mb-12">How it <span className="gold-text">works</span></h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <div key={s.title} className="glass-card-hover p-6">
                <div className="w-10 h-10 rounded-lg gold-gradient flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <p className="text-xs text-primary font-semibold mb-1">Step {i + 1}</p>
                <h3 className="font-semibold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-border/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold flex items-center justify-center gap-2">
              <LineChart className="w-6 h-6 text-primary" /> Live <span className="gold-text">leaderboard</span>
            </h2>
            <p className="text-muted-foreground mt-3">Performance is public — pick the trader that fits your style.</p>
          </div>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
            </div>
          ) : traders.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">Trader leaderboard is being updated — check back shortly.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {traders.slice(0, 6).map((t) => (
                <TraderCard key={t.id} trader={t} onCopy={() => navigate("/signup")} actionLabel="Copy Trader" />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-20 border-t border-border/50">
        <div className="container">
          <div className="glass-card p-10 md:p-16 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              Your first copy trade is <span className="gold-text">minutes away</span>
            </h2>
            <p className="text-muted-foreground mb-8">Create an account, fund it in USDT, and pick a trader to mirror.</p>
            <Button size="lg" onClick={() => navigate("/signup")} className="gold-gradient text-primary-foreground font-semibold px-8 h-12">
              Create Free Account <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-10">
        <div className="container text-center text-sm text-muted-foreground">
          Copy trading involves risk. Past performance does not guarantee future results.
        </div>
      </footer>
    </div>
  );
};

export default CopyTrading;
