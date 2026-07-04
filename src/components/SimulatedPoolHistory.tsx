import { TrendingUp, MessageSquare, Star, CheckCircle, ArrowUpRight, Quote } from "lucide-react";
import { useMemo } from "react";

const pastPools = [
  { name: "Gold Rush Alpha", symbol: "XAUUSD", profit: 12450, entry: 500, participants: 25, split: 70, duration: "14 days", date: "Mar 2026" },
  { name: "BTC Momentum", symbol: "BTCUSD", profit: 8920, entry: 1000, participants: 15, split: 75, duration: "21 days", date: "Feb 2026" },
  { name: "Forex Elite Q1", symbol: "EURUSD", profit: 5670, entry: 250, participants: 40, split: 65, duration: "30 days", date: "Jan 2026" },
  { name: "Oil Surge", symbol: "USOIL", profit: 15800, entry: 750, participants: 20, split: 80, duration: "10 days", date: "Dec 2025" },
  { name: "Crypto Wave", symbol: "ETHUSD", profit: 22100, entry: 2000, participants: 10, split: 70, duration: "28 days", date: "Nov 2025" },
];

const payouts = [
  { trader: "James K.", amount: "$3,420", method: "USDT", pool: "Gold Rush Alpha", status: "Paid" },
  { trader: "Sarah M.", amount: "$6,150", method: "USDT", pool: "BTC Momentum", status: "Paid" },
  { trader: "Lisa T.", amount: "$12,640", method: "Bank/USDT", pool: "Oil Surge", status: "Paid" },
];

// A large pool of testimonials — shuffled per session for unpredictability
const rawTestimonials = [
  { name: "James K.", country: "🇺🇸", profit: "$3,420", pool: "Gold Rush Alpha", text: "Incredible returns! The team's analysis on XAUUSD was spot on. Joined with $500 and walked away with $3,420 profit in just 2 weeks.", rating: 5 },
  { name: "Sarah M.", country: "🇬🇧", profit: "$6,150", pool: "BTC Momentum", text: "Best trading pool I've ever joined. Transparent profit splits and the admin kept us updated daily. My $1,000 turned into $6,150.", rating: 5 },
  { name: "David R.", country: "🇨🇦", profit: "$1,840", pool: "Forex Elite Q1", text: "Low entry, high returns. Perfect for beginners. The pool chat was super helpful and I learned a lot from other traders.", rating: 5 },
  { name: "Lisa T.", country: "🇦🇺", profit: "$12,640", pool: "Oil Surge", text: "The oil surge pool was legendary. 80% profit split and the trade execution was flawless. Already waiting for the next one!", rating: 5 },
  { name: "Michael O.", country: "🇳🇬", profit: "$15,470", pool: "Crypto Wave", text: "Joined the ETH pool with $2,000. The team rode the wave perfectly. Got $15,470 back. This platform is the real deal.", rating: 5 },
  { name: "Aisha N.", country: "🇰🇪", profit: "$2,100", pool: "Gold Rush Alpha", text: "First time doing pool trading and I'm hooked. The transparency and profit tracking in real-time was amazing.", rating: 4 },
  { name: "Rahul P.", country: "🇮🇳", profit: "$4,890", pool: "BTC Momentum", text: "Withdrew via USDT in under 10 minutes. No hidden fees, no runaround. Sending my brother the referral now.", rating: 5 },
  { name: "Elena V.", country: "🇪🇸", profit: "$7,300", pool: "Crypto Wave", text: "The analytics dashboard alone is worth joining. Watched every trade in real time. Payout hit exactly what was promised.", rating: 5 },
  { name: "Chen W.", country: "🇸🇬", profit: "$9,180", pool: "Forex Elite Q1", text: "I've tried 4 copy-trading platforms. TradeLux is the only one where the numbers match what actually lands in my wallet.", rating: 5 },
  { name: "Amara O.", country: "🇬🇭", profit: "$2,760", pool: "Gold Rush Alpha", text: "Started with the minimum. The pool chat kept me calm when the market dipped. Ended up with 5x my entry.", rating: 5 },
  { name: "Tomás F.", country: "🇧🇷", profit: "$5,200", pool: "Oil Surge", text: "Fast, clean, honest. My USOIL entry closed 3 days early with a big profit. Cashed out same-day.", rating: 5 },
  { name: "Yuki S.", country: "🇯🇵", profit: "$3,940", pool: "BTC Momentum", text: "The countdown timer on live pools is addictive. Joined 2 back-to-back — both profitable. Discipline meets great UX.", rating: 5 },
  { name: "Marcus B.", country: "🇩🇪", profit: "$11,090", pool: "Crypto Wave", text: "Serious platform. Real KYC, real payouts, real strategy notes from the admin. I moved my whole side portfolio here.", rating: 5 },
  { name: "Priya D.", country: "🇮🇳", profit: "$1,520", pool: "Forex Elite Q1", text: "Beginner friendly. The welcome bonus + my $250 deposit doubled inside a month. No stress.", rating: 4 },
  { name: "Kwame A.", country: "🇬🇭", profit: "$4,010", pool: "Gold Rush Alpha", text: "Withdrawn twice already. Both hit my USDT wallet in minutes. I trust this crew.", rating: 5 },
  { name: "Sofia G.", country: "🇮🇹", profit: "$6,780", pool: "Oil Surge", text: "The profit split was clearly explained BEFORE I joined. Zero surprises at payout. This is how it should be done.", rating: 5 },
  { name: "Noah H.", country: "🇳🇱", profit: "$8,340", pool: "BTC Momentum", text: "I've made more here in 6 weeks than I did trading solo for a year. The pool structure just works.", rating: 5 },
  { name: "Fatima Z.", country: "🇦🇪", profit: "$14,220", pool: "Crypto Wave", text: "$2k in → $14k out. Screenshots don't lie. Reinvested straight into the next pool.", rating: 5 },
  { name: "Oliver P.", country: "🇬🇧", profit: "$2,980", pool: "Forex Elite Q1", text: "Pool chat + live analytics = confidence. First time I've actually enjoyed watching a trade unfold.", rating: 5 },
  { name: "Isabella R.", country: "🇲🇽", profit: "$5,610", pool: "Gold Rush Alpha", text: "Support answered me at 2am. On a Sunday. Then my payout landed at 3am. Who does that?", rating: 5 },
  { name: "Hassan I.", country: "🇵🇰", profit: "$3,220", pool: "Oil Surge", text: "Halal-friendly setup for me since it's fixed split, no interest. Profit was clean and quick.", rating: 5 },
  { name: "Lara K.", country: "🇹🇷", profit: "$7,880", pool: "BTC Momentum", text: "The virtual card feature let me spend my profits instantly. Game changer for actually enjoying the wins.", rating: 5 },
  { name: "Diego C.", country: "🇦🇷", profit: "$4,450", pool: "Crypto Wave", text: "From Buenos Aires — USDT withdraw beat every local option. Fees basically zero. I'm not going back.", rating: 5 },
  { name: "Emma L.", country: "🇸🇪", profit: "$6,020", pool: "Forex Elite Q1", text: "Clean UI, honest numbers, real people in the chat. Refreshing after so many scammy platforms.", rating: 5 },
  { name: "Idris M.", country: "🇳🇬", profit: "$9,750", pool: "Gold Rush Alpha", text: "Joined 3 pools this year. Green on all 3. This is the most consistent income stream I've ever had online.", rating: 5 },
  { name: "Anna K.", country: "🇵🇱", profit: "$2,340", pool: "Oil Surge", text: "The 'Leave & refund' option before start gave me the confidence to try it. Ended up staying and profiting.", rating: 5 },
  { name: "Ryan T.", country: "🇮🇪", profit: "$5,890", pool: "BTC Momentum", text: "Serious edge. Serious execution. And the profit hits my balance the second the pool closes.", rating: 5 },
  { name: "Zara S.", country: "🇿🇦", profit: "$4,180", pool: "Crypto Wave", text: "I recommended TradeLux to my whole trading group. 6 of them joined. All 6 have been paid out.", rating: 5 },
];

// Deterministic shuffle so it feels fresh every reload but doesn't jitter mid-session
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const avatarGradients = [
  "from-amber-400 to-yellow-600", "from-fuchsia-500 to-purple-700", "from-sky-400 to-blue-700",
  "from-emerald-400 to-green-700", "from-rose-400 to-red-700", "from-orange-400 to-amber-700",
  "from-teal-400 to-cyan-700", "from-indigo-400 to-violet-700",
];

const TestimonialCard = ({ t, idx }: { t: any; idx: number }) => (
  <div className="w-[320px] shrink-0 rounded-xl bg-secondary/40 border border-border/60 p-4 backdrop-blur-sm hover:border-primary/40 transition-colors relative">
    <Quote className="w-6 h-6 text-primary/20 absolute top-3 right-3" />
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradients[idx % avatarGradients.length]} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
        {initials(t.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium flex items-center gap-1.5">{t.name} <span className="text-base leading-none">{t.country}</span></p>
        <p className="text-[11px] text-muted-foreground truncate">{t.pool}</p>
      </div>
      <span className="text-sm font-bold text-success shrink-0">{t.profit}</span>
    </div>
    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{t.text}</p>
    <div className="flex items-center gap-0.5 mt-3">
      {Array.from({ length: t.rating }).map((_, j) => (
        <Star key={j} className="w-3 h-3 fill-primary text-primary" />
      ))}
    </div>
  </div>
);

const SimulatedPoolHistory = () => {
  // Split into 3 marquee rows for parallax feel
  const rows = useMemo(() => {
    const shuffled = shuffle(rawTestimonials);
    const per = Math.ceil(shuffled.length / 3);
    return [shuffled.slice(0, per), shuffled.slice(per, per * 2), shuffled.slice(per * 2)];
  }, []);

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

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpRight className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Recent Pool Payouts</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {payouts.map((p) => (
            <div key={`${p.trader}-${p.pool}`} className="rounded-lg bg-secondary/30 border border-border/50 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className="text-sm font-medium">{p.trader}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">{p.status}</span>
              </div>
              <p className="text-lg font-bold text-success">{p.amount}</p>
              <p className="text-xs text-muted-foreground">{p.pool} · {p.method}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trader Testimonials — animated infinite marquees */}
      <div className="glass-card p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Trader Reviews</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-primary text-primary" /> 4.9 · {rawTestimonials.length}+ verified stories</span>
          </div>
        </div>

        <div className="relative -mx-6 space-y-4">
          {/* fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent z-10" />

          {rows.map((row, i) => (
            <div key={i} className="group flex overflow-hidden">
              <div
                className={`flex gap-4 shrink-0 pr-4 ${i % 2 === 0 ? "animate-marquee-left" : "animate-marquee-right"} group-hover:[animation-play-state:paused]`}
                style={{ animationDuration: `${45 + i * 12}s` }}
              >
                {[...row, ...row].map((t, idx) => (
                  <TestimonialCard key={`${i}-${idx}`} t={t} idx={idx + i} />
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
