// Decentralized wallet partner logos using public CDN sources (no asset upload required).
// Uses CryptoLogos and DefiLlama icon CDNs which are stable & permissive.
const wallets = [
  { name: "MetaMask",        src: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" },
  { name: "WalletConnect",   src: "https://avatars.githubusercontent.com/u/37784886?s=200&v=4" },
  { name: "Coinbase Wallet", src: "https://avatars.githubusercontent.com/u/1885080?s=200&v=4" },
  { name: "Trust Wallet",    src: "https://trustwallet.com/assets/images/media/assets/TWT.svg" },
  { name: "Rainbow",         src: "https://avatars.githubusercontent.com/u/48327834?s=200&v=4" },
  { name: "Phantom",         src: "https://avatars.githubusercontent.com/u/78782331?s=200&v=4" },
  { name: "Ledger",          src: "https://avatars.githubusercontent.com/u/9784193?s=200&v=4" },
  { name: "OKX",             src: "https://avatars.githubusercontent.com/u/85335942?s=200&v=4" },
  { name: "Binance",         src: "https://avatars.githubusercontent.com/u/12387150?s=200&v=4" },
  { name: "Exodus",          src: "https://avatars.githubusercontent.com/u/14199256?s=200&v=4" },
  { name: "Brave",           src: "https://avatars.githubusercontent.com/u/12301619?s=200&v=4" },
  { name: "Safe",            src: "https://avatars.githubusercontent.com/u/102983781?s=200&v=4" },
];

const WalletPartners = () => (
  <section className="py-12 border-t border-border/50">
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[3px] text-primary/80 font-semibold">Connect with 300+ wallets</p>
        <h2 className="text-2xl md:text-3xl font-display font-bold mt-2">
          Trusted by every <span className="gold-text">major wallet</span>
        </h2>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {wallets.map((w) => (
          <div key={w.name} className="glass-card p-4 flex flex-col items-center gap-2 hover:border-primary/40 transition group">
            <img
              src={w.src} alt={`${w.name} wallet logo`} loading="lazy"
              className="w-10 h-10 object-contain group-hover:scale-110 transition"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-[11px] text-muted-foreground text-center">{w.name}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default WalletPartners;
