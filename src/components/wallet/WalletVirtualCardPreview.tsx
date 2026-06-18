import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CreditCard, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import VirtualCardVisual, { CardDesign } from "@/components/cards/VirtualCardVisual";
import { Button } from "@/components/ui/button";

/**
 * Compact virtual-card preview displayed under the wallet hero.
 * Visible on mobile (and tablet) — desktop users have the full /dashboard/cards page.
 */
const WalletVirtualCardPreview = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["wallet-virtual-cards", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("virtual_cards" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1);
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  if (isLoading) return null;
  const card = cards[0];

  return (
    <div className="lg:hidden glass-card p-4 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Virtual Card</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-primary hover:bg-primary/10"
          onClick={() => navigate("/dashboard/cards")}
        >
          Manage <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {card ? (
        <div className="scale-[0.92] origin-top">
          <VirtualCardVisual
            brand={card.brand}
            last4={card.last4}
            cardholder={card.cardholder_name}
            expMonth={card.expiry_month}
            expYear={card.expiry_year}
            balance={card.balance}
            status={card.status}
            design={(card.design as CardDesign) || "aurora"}
          />
        </div>
      ) : (
        <button
          onClick={() => navigate("/dashboard/cards")}
          className="w-full aspect-[1.586/1] max-w-[400px] mx-auto rounded-2xl border-2 border-dashed border-border bg-secondary/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-7 h-7" />
          <span className="text-sm font-medium">Issue your first virtual card</span>
          <span className="text-[10px] uppercase tracking-wider">$20 one-time fee</span>
        </button>
      )}
    </div>
  );
};

export default WalletVirtualCardPreview;
