import { Settings, Globe, Bell, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SettingsPage = () => {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your platform preferences</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <h3 className="font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Language</h3>
        <Select defaultValue="en">
          <SelectTrigger className="bg-secondary/50 border-border w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="ar">العربية</SelectItem>
            <SelectItem value="es">Español</SelectItem>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="zh">中文</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-primary" /> Notifications</h3>
        {[
          { label: "Deposit confirmations", desc: "Get notified when deposits are approved", default: true },
          { label: "Pool updates", desc: "Progress and completion alerts", default: true },
          { label: "MT5 status changes", desc: "Account assignment and availability", default: false },
          { label: "Marketing emails", desc: "News and platform updates", default: false },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch defaultChecked={item.default} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsPage;
