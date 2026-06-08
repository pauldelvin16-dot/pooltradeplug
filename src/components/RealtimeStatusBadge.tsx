import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

type State = "connected" | "reconnecting" | "offline";

// Listens to the global realtime socket and exposes a small badge so users
// know if pool/deposit live updates are flowing.
const RealtimeStatusBadge = () => {
  const [state, setState] = useState<State>("connected");

  useEffect(() => {
    // Heartbeat channel just to surface socket state
    const ch = supabase.channel("realtime-status-probe");
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") setState("connected");
      else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setState("reconnecting");
      else if (status === "CLOSED") setState("offline");
    });

    const onOnline = () => {
      setState("reconnecting");
      try { supabase.realtime.connect(); } catch (_) {}
    };
    const onOffline = () => setState("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Auto-retry: if not connected after 8s, force a reconnect attempt
    const retry = setInterval(() => {
      const sockState = (supabase.realtime as any)?.connectionState?.() as string | undefined;
      if (sockState && sockState !== "open") {
        setState("reconnecting");
        try { supabase.realtime.connect(); } catch (_) {}
      } else if (sockState === "open") {
        setState((s) => (s === "offline" ? "reconnecting" : "connected"));
      }
    }, 8000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(retry);
      supabase.removeChannel(ch);
    };
  }, []);

  if (state === "connected") {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-success/80">
        <Wifi className="w-3 h-3" /> Live
      </span>
    );
  }
  if (state === "reconnecting") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-warning animate-pulse">
        <RefreshCw className="w-3 h-3 animate-spin" /> Reconnecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
      <WifiOff className="w-3 h-3" /> Offline
    </span>
  );
};

export default RealtimeStatusBadge;
