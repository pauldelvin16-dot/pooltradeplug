import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface DepositCountdownProps {
  expiresAt: string;
  onExpired?: () => void;
}

const DepositCountdown = ({ expiresAt, onExpired }: DepositCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({ minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(expiresAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ minutes: 0, seconds: 0 });
        onExpired?.();
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        minutes: Math.floor(diff / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  if (expired) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm font-medium">
        <Clock className="w-4 h-4" />
        <span>Session expired — please create a new deposit</span>
      </div>
    );
  }

  const totalSeconds = timeLeft.minutes * 60 + timeLeft.seconds;
  const isUrgent = totalSeconds < 300;

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${isUrgent ? "text-destructive" : "text-warning"}`}>
      <Clock className="w-4 h-4 animate-pulse" />
      <span>
        Time remaining: {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </span>
    </div>
  );
};

export default DepositCountdown;
