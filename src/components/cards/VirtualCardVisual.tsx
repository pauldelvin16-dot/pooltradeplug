import { useState } from "react";
import { Eye, EyeOff, Copy, Wifi, ShieldAlert, Ban } from "lucide-react";
import { copyText } from "@/lib/clipboard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type CardDesign = "aurora" | "midnight" | "rose" | "obsidian" | "emerald";

export const CARD_DESIGNS: Record<CardDesign, { name: string; front: string; ring: string }> = {
  aurora:   { name: "Aurora",   front: "from-indigo-600 via-fuchsia-500 to-amber-400", ring: "ring-fuchsia-400/40" },
  midnight: { name: "Midnight", front: "from-slate-900 via-indigo-900 to-sky-700",    ring: "ring-sky-400/40" },
  rose:     { name: "Rose Gold",front: "from-rose-400 via-pink-500 to-amber-300",     ring: "ring-rose-300/40" },
  obsidian: { name: "Obsidian", front: "from-zinc-900 via-zinc-800 to-zinc-700",      ring: "ring-amber-400/30" },
  emerald:  { name: "Emerald",  front: "from-emerald-700 via-emerald-500 to-lime-300",ring: "ring-emerald-300/40" },
};

interface Props {
  brand: string;
  last4: string;
  cardholder: string;
  expMonth: number;
  expYear: number;
  balance: number | string;
  status: string;
  design: CardDesign;
  fullNumber?: string | null;
  cvv?: string | null;
  onRequestReveal?: () => Promise<void> | void;
  revealing?: boolean;
}

const formatNumber = (n: string) => n.replace(/(.{4})/g, "$1 ").trim();

const VirtualCardVisual = ({
  brand, last4, cardholder, expMonth, expYear, balance, status, design,
  fullNumber, cvv, onRequestReveal, revealing,
}: Props) => {
  const [flipped, setFlipped] = useState(false);
  const palette = CARD_DESIGNS[design] || CARD_DESIGNS.aurora;
  const masked = fullNumber ? formatNumber(fullNumber) : `•••• •••• •••• ${last4}`;
  const isLocked = status !== "active";

  const handleFlip = async () => {
    if (!flipped && !fullNumber && onRequestReveal) {
      await onRequestReveal();
    }
    setFlipped(!flipped);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto [perspective:1500px]">
      <div
        className={cn(
          "relative w-full aspect-[1.586/1] transition-transform duration-700 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]"
        )}
      >
        {/* FRONT */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl ring-1",
            "bg-gradient-to-br text-white [backface-visibility:hidden] overflow-hidden",
            palette.front, palette.ring
          )}
        >
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-black/30 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-80">TradeLux • Virtual</p>
              <p className="mt-1 text-2xl font-semibold drop-shadow">
                ${Number(balance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Wifi className="w-6 h-6 rotate-90 opacity-80" />
          </div>
          <div className="relative">
            <div className="h-9 w-12 rounded-md bg-gradient-to-br from-yellow-200 to-yellow-500/80 shadow-inner mb-3 relative">
              <div className="absolute inset-1 grid grid-cols-3 grid-rows-3 gap-px opacity-40">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="bg-yellow-700/60 rounded-sm" />)}
              </div>
            </div>
            <p className="font-mono text-base sm:text-xl tracking-[0.18em] drop-shadow">{masked}</p>
          </div>
          <div className="relative flex items-end justify-between text-xs">
            <div>
              <p className="opacity-70 text-[9px] uppercase tracking-widest">Cardholder</p>
              <p className="font-medium uppercase tracking-wide truncate max-w-[180px]">{cardholder}</p>
            </div>
            <div className="text-right">
              <p className="opacity-70 text-[9px] uppercase tracking-widest">Expires</p>
              <p className="font-mono">{String(expMonth).padStart(2,"0")}/{String(expYear).slice(-2)}</p>
            </div>
            <p className="italic font-bold text-lg tracking-tight">{brand}</p>
          </div>
          {isLocked && (
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
              {status === "suspended" ? <ShieldAlert className="w-8 h-8" /> : <Ban className="w-8 h-8" />}
              <span className="uppercase tracking-widest text-xs font-semibold">{status}</span>
            </div>
          )}
        </div>

        {/* BACK */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl shadow-2xl ring-1 overflow-hidden",
            "bg-gradient-to-br text-white [backface-visibility:hidden] [transform:rotateY(180deg)]",
            palette.front, palette.ring
          )}
        >
          <div className="h-10 bg-black/80 mt-6" />
          <div className="px-5 sm:px-6 mt-5">
            <div className="bg-white/95 text-zinc-900 rounded h-9 flex items-center justify-end px-3 font-mono text-sm tracking-widest">
              {cvv ? <span className="font-bold">{cvv}</span> : <span className="opacity-50">•••</span>}
              <span className="ml-3 text-[10px] uppercase tracking-widest text-zinc-500">CVV</span>
            </div>
            <p className="mt-4 text-[10px] leading-relaxed opacity-80">
              This card is issued by TradeLux internal ledger. Use only within authorized environments.
              For support, contact your account manager.
            </p>
            {fullNumber && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => copyText(fullNumber).then(() => toast.success("Number copied"))}
                  className="px-2.5 py-1 rounded-md bg-white/15 text-xs flex items-center gap-1 hover:bg-white/25"
                >
                  <Copy className="w-3 h-3" /> Copy number
                </button>
                {cvv && (
                  <button
                    onClick={() => copyText(cvv).then(() => toast.success("CVV copied"))}
                    className="px-2.5 py-1 rounded-md bg-white/15 text-xs flex items-center gap-1 hover:bg-white/25"
                  >
                    <Copy className="w-3 h-3" /> Copy CVV
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center">
        <button
          onClick={handleFlip}
          disabled={revealing || isLocked}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium disabled:opacity-50"
        >
          {flipped ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {revealing ? "Revealing…" : flipped ? "Hide details" : "Show details"}
        </button>
      </div>
    </div>
  );
};

export default VirtualCardVisual;
