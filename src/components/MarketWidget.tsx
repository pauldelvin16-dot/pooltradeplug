import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Sparkles } from "lucide-react";

type Coin = {
  id: string; symbol: string; name: string; image: string;
  current_price: number; price_change_percentage_24h: number;
  market_cap: number; total_volume: number; sparkline_in_7d?: { price: number[] };
};

const Sparkline = ({ data, up }: { data: number[]; up: boolean }) => {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 80},${28 - ((v - min) / range) * 26}`).join(" ");
  return (
    <svg width="80" height="30" className="opacity-90">
      <polyline points={pts} fill="none" stroke={up ? "hsl(var(--success))" : "hsl(var(--destructive))"} strokeWidth="1.5" />
    </svg>
  );
};

const MarketWidget = () => {
  const { data = [], isLoading } = useQuery<Coin[]>({
    queryKey: ["market-widget"],
    queryFn: async () => {
      const r = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h"
      );
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> Live Market
        </h3>
        <span className="text-[10px] text-muted-foreground">Updates every 30s</span>
      </div>
      <div className="space-y-2 max-h-[440px] overflow-auto pr-1">
        {isLoading && <p className="text-xs text-muted-foreground">Loading market data…</p>}
        {data.map((c) => {
          const up = (c.price_change_percentage_24h || 0) >= 0;
          return (
            <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={c.image} alt={c.name} className="w-7 h-7 rounded-full" loading="lazy" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{c.name}</p>
                  <p className="text-[10px] uppercase text-muted-foreground">{c.symbol}</p>
                </div>
              </div>
              <Sparkline data={c.sparkline_in_7d?.price || []} up={up} />
              <div className="text-right shrink-0 ml-2">
                <p className="text-sm font-mono font-semibold">
                  ${c.current_price < 1 ? c.current_price.toFixed(4) : c.current_price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </p>
                <p className={`text-[11px] flex items-center justify-end gap-0.5 ${up ? "text-success" : "text-destructive"}`}>
                  {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {(c.price_change_percentage_24h || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MarketWidget;
