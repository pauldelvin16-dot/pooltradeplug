import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

const StatCard = ({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) => {
  const changeColor = {
    positive: "text-success",
    negative: "text-destructive",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="w-9 h-9 rounded-lg gold-gradient flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${changeColor[changeType]}`}>{change}</p>
      )}
    </div>
  );
};

export default StatCard;
