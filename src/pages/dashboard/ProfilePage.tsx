import { User, Mail, Shield, Smartphone, Bell, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const ProfilePage = () => {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      {/* Avatar & Name */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground">
            T
          </div>
          <div>
            <h3 className="font-semibold text-lg">Demo Trader</h3>
            <p className="text-sm text-muted-foreground">trader@example.com</p>
            <p className="text-xs text-primary mt-1">● Verified Trader</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input defaultValue="Demo" className="bg-secondary/50 border-border" />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input defaultValue="Trader" className="bg-secondary/50 border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue="trader@example.com" disabled className="bg-secondary/30 border-border" />
          </div>
          <Button className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 w-fit">
            Save Changes
          </Button>
        </div>
      </div>

      {/* Security */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Security</h3>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add extra security to your account</p>
            </div>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm">Login Notifications</p>
              <p className="text-xs text-muted-foreground">Get notified of new device logins</p>
            </div>
          </div>
          <Switch defaultChecked />
        </div>
      </div>

      {/* Telegram Linking */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Link className="w-4 h-4 text-primary" /> Telegram Bot</h3>
        <p className="text-sm text-muted-foreground">
          Link your Telegram account to receive notifications and manage your account via bot commands.
        </p>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm">
          <p className="text-muted-foreground">Status: <span className="text-warning">Not linked</span></p>
        </div>
        <Button variant="outline" className="border-primary/30 hover:bg-primary/5 hover:border-primary/50">
          Link Telegram Account
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
