import { TrendingUp, MessageSquare, Star, CheckCircle } from "lucide-react";

const pastPools = [
  { name: "Gold Rush Alpha", symbol: "XAUUSD", profit: 12450, entry: 500, participants: 25, split: 70, duration: "14 days", date: "Mar 2026" },
  { name: "BTC Momentum", symbol: "BTCUSD", profit: 8920, entry: 1000, participants: 15, split: 75, duration: "21 days", date: "Feb 2026" },
  { name: "Forex Elite Q1", symbol: "EURUSD", profit: 5670, entry: 250, participants: 40, split: 65, duration: "30 days", date: "Jan 2026" },
  { name: "Oil Surge", symbol: "USOIL", profit: 15800, entry: 750, participants: 20, split: 80, duration: "10 days", date: "Dec 2025" },
  { name: "Crypto Wave", symbol: "ETHUSD", profit: 22100, entry: 2000, participants: 10, split: 70, duration: "28 days", date: "Nov 2025" },
];

const testimonials = [
  { name: "James K.", profit: "$3,420", pool: "Gold Rush Alpha", text: "Incredible returns! The team's analysis on XAUUSD was spot on. Joined with $500 and walked away with $3,420 profit in just 2 weeks.", avatar: "JK", rating: 5 },
  { name: "Sarah M.", profit: "$6,150", pool: "BTC Momentum", text: "Best trading pool I've ever joined. Transparent profit splits and the admin kept us updated daily. My $1,000 turned into $6,150.", avatar: "SM", rating: 5 },
  { name: "David R.", profit: "$1,840", pool: "Forex Elite Q1", text: "Low entry, high returns. Perfect for beginners. The pool chat was super helpful and I learned a lot from other traders.", avatar: "DR", rating: 5 },
  { name: "Lisa T.", profit: "$12,640", pool: "Oil Surge", text: "The oil surge pool was legendary. 80% profit split and the trade execution was flawless. Already waiting for the next one!", avatar: "LT", rating: 5 },
  { name: "Michael O.", profit: "$15,470", pool: "Crypto Wave", text: "Joined the ETH pool with $2,000. The team rode the wave perfectly. Got $15,470 back. This platform is the real deal.", avatar: "MO", rating: 5 },
  { name: "Aisha N.", profit: "$2,100", pool: "Gold Rush Alpha", text: "First time doing pool trading and I'm hooked. The transparency and profit tracking in real-time was amazing.", avatar: "AN", rating: 4 },
];

const SimulatedPoolHistory = () => {
  return (
    <div className="space-y-6">
      {/* Past Pool Performance */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Past Pool Performance</h3>
        </div>
        <div className="space-y-3">
          {pastPools.map((pool) => (
            <div key={pool.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{pool.name}</p>
                    <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">{pool.symbol}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{pool.date} · {pool.duration} · {pool.participants} traders · {pool.split}% split</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-success">+${pool.profit.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">${pool.entry} entry</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trader Testimonials */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Trader Reviews</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {testimonials.map((t, i) => (
            <div key={i} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full gold-gradient flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {t.avatar}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.pool}</p>
                </div>
                <span className="text-sm font-bold text-success">{t.profit}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.text}</p>
              <div className="flex items-center gap-0.5 mt-2">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-3 h-3 fill-primary text-primary" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimulatedPoolHistory;
