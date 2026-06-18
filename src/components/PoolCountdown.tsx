import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface Props {
  endDate?: string | null;
  fallbackDays?: number;
  compact?: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

const PoolCountdown = ({ endDate, fallbackDays, compact }: Props) => {
  const target = endDate
    ? new Date(endDate).getTime()
    : fallbackDays
      ? Date.now() + fallbackDays * 86400000
      : null;

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!target) return <span className="text-muted-foreground">—</span>;
  const diff = Math.max(0, target - now);
  if (diff === 0) return <span className="text-success font-semibold">Completed</span>;

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const urgent = diff < 3600000;
  if (compact) {
    return (
      <span className={`font-mono text-xs ${urgent ? "text-warning animate-pulse" : ""}`}>
        {d > 0 ? `${d}d ` : ""}{pad(h)}:{pad(m)}:{pad(s)}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 font-mono ${urgent ? "text-warning animate-pulse" : ""}`}>
      <Clock className="w-3 h-3" />
      {d > 0 ? `${d}d ` : ""}{pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
};

export default PoolCountdown;
