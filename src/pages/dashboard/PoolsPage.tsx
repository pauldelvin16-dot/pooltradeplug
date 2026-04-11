import { Users, Target, Clock, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import StatusBadge from "@/components/StatusBadge";

const pools = [
  {
    id: "POOL-23",
    name: "Gold Rush Alpha",
    targetProfit: 50000,
    currentProfit: 32000,
    maxParticipants: 20,
    currentParticipants: 14,
    entryAmount: 1000,
    duration: "30 days",
    daysLeft: 12,
    status: "active" as const,
  },
  {
    id: "POOL-24",
    name: "Diamond Scalper",
    targetProfit: 100000,
    currentProfit: 98500,
    maxParticipants: 50,
    currentParticipants: 50,
    entryAmount: 2500,
    duration: "60 days",
    daysLeft: 3,
    status: "active" as const,
  },
  {
    id: "POOL-21",
    name: "Platinum Swing",
    targetProfit: 25000,
    currentProfit: 25000,
    maxParticipants: 10,
    currentParticipants: 10,
    entryAmount: 500,
    duration: "14 days",
    daysLeft: 0,
    status: "completed" as const,
  },
];

const PoolsPage = () => {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Pool Trading</h1>
          <p className="text-sm text-muted-foreground mt-1">Join exclusive trading pools for shared profits</p>
        </div>
      </div>

      <div className="grid gap-6">
        {pools.map((pool) => {
          const profitPercent = (pool.currentProfit / pool.targetProfit) * 100;
          const isFull = pool.currentParticipants >= pool.maxParticipants;

          return (
            <div key={pool.id} className="glass-card-hover p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl gold-gradient flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{pool.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{pool.id}</p>
                  </div>
                </div>
                <StatusBadge status={pool.status} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> Target</p>
                  <p className="font-semibold">${pool.targetProfit.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Participants</p>
                  <p className="font-semibold">{pool.currentParticipants}/{pool.maxParticipants}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Entry Amount</p>
                  <p className="font-semibold">${pool.entryAmount.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Time Left</p>
                  <p className="font-semibold">{pool.daysLeft > 0 ? `${pool.daysLeft} days` : "Completed"}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profit Progress</span>
                  <span className={`font-medium ${profitPercent >= 100 ? "text-success" : "text-primary"}`}>
                    ${pool.currentProfit.toLocaleString()} / ${pool.targetProfit.toLocaleString()}
                  </span>
                </div>
                <Progress value={Math.min(profitPercent, 100)} className="h-3 bg-secondary" />
              </div>

              {pool.status === "active" && !isFull && (
                <Button className="mt-4 gold-gradient text-primary-foreground font-semibold hover:opacity-90">
                  Join Pool <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {isFull && pool.status === "active" && (
                <p className="mt-4 text-sm text-muted-foreground">Pool is full — check back for new pools</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PoolsPage;
