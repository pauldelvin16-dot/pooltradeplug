import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown } from "lucide-react";

type Coin = { id: string; symbol: string; name: string; image: string; current_price: number; price_change_percentage_24h: number };

const CryptoTicker = () => {
  const { data = [] } = useQuery<Coin[]>({
    queryKey: ["crypto-ticker"],
    queryFn: async () => {
      const r = await fetch(
        "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,tron,polygon-ecosystem-token,tether&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h"
      );
      if (!r.ok) return [];
      return r.json();
    },
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  // Add gold price (approximated via PAX Gold) — fallback fetch
  const { data: gold } = useQuery({
    queryKey: ["gold-price"],
    queryFn: async () => {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd&include_24hr_change=true");
      if (!r.ok) return null;
      const j = await r.json();
      return { price: j["pax-gold"]?.usd, change: j["pax-gold"]?.usd_24h_change };
    },
    refetchInterval: 60_000,
  });

  const items = [
    ...(gold?.price ? [{ id: "gold", symbol: "XAU", name: "Gold", image: "🥇", current_price: gold.price, price_change_percentage_24h: gold.change || 0, isEmoji: true }] : []),
    ...data.map((c) => ({ ...c, isEmoji: false })),
  ];

  if (!items.length) return null;

  return (
    <div className="border-y border-border/50 bg-card/40 backdrop-blur-xl overflow-hidden">
      <div className="relative">
        <div className="flex animate-marquee gap-8 py-3 whitespace-nowrap">
          {[...items, ...items].map((c, i) => {
            const up = (c.price_change_percentage_24h || 0) >= 0;
            return (
              <div key={`${c.id}-${i}`} className="flex items-center gap-2 text-sm shrink-0">
                {(c as any).isEmoji ? (
                  <span className="text-lg">{c.image}</span>
                ) : (
                  <img src={c.image} alt={c.name} className="w-5 h-5 rounded-full" loading="lazy" />
                )}
                <span className="font-semibold uppercase">{c.symbol}</span>
                <span className="text-foreground/90 font-mono">
                  ${c.current_price < 1 ? c.current_price.toFixed(4) : c.current_price.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-success" : "text-destructive"}`}>
                  {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {(c.price_change_percentage_24h || 0).toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CryptoTicker;
