import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Trader } from "@/components/copy/TraderCard";

export const useTraders = (includeHidden = false) =>
  useQuery({
    queryKey: ["copy-traders", includeHidden],
    queryFn: async () => {
      let q = (supabase.from("copy_traders" as any) as any).select("*").order("roi_30d", { ascending: false });
      if (!includeHidden) q = q.neq("status", "hidden");
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Trader[];
    },
  });

export const useMySubscriptions = (userId?: string) =>
  useQuery({
    queryKey: ["copy-subscriptions", userId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("copy_subscriptions" as any) as any)
        .select("*, copy_traders(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!userId,
  });

export const useTraderTrades = (traderId?: string) =>
  useQuery({
    queryKey: ["copy-trades", traderId],
    queryFn: async () => {
      let q = (supabase.from("copy_trades" as any) as any)
        .select("*")
        .order("opened_at", { ascending: false })
        .limit(30);
      if (traderId) q = q.eq("trader_id", traderId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });
