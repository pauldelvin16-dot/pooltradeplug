import { BadgeCheck, TrendingUp, TrendingDown, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface Trader {
  id: string;
  name: string;
  handle: string;
  avatar_url?: string | null;
  bio?: string | null;
  strategy: string;
  markets: string[];
  risk_level: string;
  win_rate: number;
  roi_30d: number;
  roi_all: number;
  max_drawdown: number;
  followers: number;
  aum: number;
  min_allocation: number;
  performance_fee: number;
  is_verified: boolean;
  status: string;
}

const riskTone: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
};

/** Deterministic sparkline so each trader has a stable-looking equity curve. */
const spark = (seed: string, up: boolean) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
  const pts: string[] = [];
  let y = 30;
  for (let i = 0; i <= 20; i++) {
    h = (h * 1103515245 + 12345) % 2147483647;
    const drift = up ? -1.1 : 1.1;
    y = Math.max(4, Math.min(46, y + drift + ((h % 100) / 100 - 0.5) * 9));
    pts.push(`${(i / 20) * 100},${y.toFixed(1)}`);
  }
  return pts.join(" ");
};

const TraderCard = ({
  trader,
  onCopy,
  copying,
  actionLabel = "Copy Trader",
}: {
  trader: Trader;
  onCopy?: (t: Trader) => void;
  copying?: boolean;
  actionLabel?: string;
}) => {
  const up = Number(trader.roi_30d) >= 0;
  const initials = trader.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="glass-card-hover p-5 flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="flex items-start gap-3 relative">
        <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center font-bold text-primary-foreground shrink-0 overflow-hidden">
          {trader.avatar_url ? (
            <img src={trader.avatar_url} alt={`${trader.name} profile`} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold truncate">{trader.name}</p>
            {trader.is_verified && <BadgeCheck className="w-4 h-4 text-primary shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{trader.handle} · {trader.strategy}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${riskTone[trader.risk_level] || riskTone.medium}`}>
          {trader.risk_level} risk
        </span>
      </div>

      <div className="relative h-12">
        <svg viewBox="0 0 100 50" preserveAspectRatio="none" className="w-full h-full">
          <polyline
            points={spark(trader.id + trader.handle, up)}
            fill="none"
            stroke={up ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className={`text-lg font-bold ${up ? "text-primary" : "text-destructive"}`}>
            {up ? "+" : ""}{Number(trader.roi_30d).toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">30d ROI</p>
        </div>
        <div>
          <p className="text-lg font-bold">{Number(trader.win_rate).toFixed(0)}%</p>
          <p className="text-[10px] text-muted-foreground">Win rate</p>
        </div>
        <div>
          <p className="text-lg font-bold">-{Number(trader.max_drawdown).toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Max DD</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(trader.markets || []).slice(0, 4).map((m) => (
          <span key={m} className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">{m}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {trader.followers} copiers</span>
        <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> ${Number(trader.aum).toLocaleString()} AUM</span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/60">
        <div className="text-xs text-muted-foreground">
          Min <span className="text-foreground font-semibold">${Number(trader.min_allocation)}</span> ·{" "}
          {Number(trader.performance_fee)}% fee
        </div>
        {onCopy && (
          <Button size="sm" disabled={copying} onClick={() => onCopy(trader)} className="gold-gradient text-primary-foreground font-semibold">
            {up ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default TraderCard;
