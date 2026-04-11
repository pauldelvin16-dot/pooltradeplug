interface StatusBadgeProps {
  status: "available" | "assigned" | "disabled" | "pending" | "confirmed" | "rejected" | "active" | "completed" | "failed";
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const styles: Record<string, string> = {
    available: "bg-success/15 text-success border-success/30",
    assigned: "bg-primary/15 text-primary border-primary/30",
    disabled: "bg-muted text-muted-foreground border-border",
    pending: "bg-warning/15 text-warning border-warning/30",
    confirmed: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    active: "bg-primary/15 text-primary border-primary/30",
    completed: "bg-success/15 text-success border-success/30",
    failed: "bg-destructive/15 text-destructive border-destructive/30",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        ["available", "confirmed", "completed"].includes(status) ? "bg-success" :
        ["assigned", "active"].includes(status) ? "bg-primary" :
        ["pending"].includes(status) ? "bg-warning" :
        ["rejected", "failed"].includes(status) ? "bg-destructive" : "bg-muted-foreground"
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

export default StatusBadge;
