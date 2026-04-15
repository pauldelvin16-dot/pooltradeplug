import { User, Shield, Smartphone, Bell, Link, Lock, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { data: settings } = useAdminSettings();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [saving, setSaving] = useState(false);

  // Password change
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated!");
      refreshProfile();
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setChangingPassword(true);
    // Verify old password by re-authenticating
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || "",
      password: oldPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error("Current password is incorrect");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password changed successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const initials = `${(profile?.first_name || "T")[0]}`.toUpperCase();
  const telegramLink = (settings as any)?.telegram_bot_link;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings</p>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center text-2xl font-bold text-primary-foreground">
            {initials}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{profile?.first_name || ""} {profile?.last_name || ""}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-primary mt-1">
              Balance: <span className="font-bold">${parseFloat(profile?.balance || "0").toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>First Name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="bg-secondary/50 border-border" />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="bg-secondary/50 border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-secondary/30 border-border" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 w-fit">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Change Password</h3>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Current Password</Label>
            <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" className="bg-secondary/50 border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-secondary/50 border-border" />
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="bg-secondary/50 border-border" />
            </div>
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword || !oldPassword || !newPassword} className="gold-gradient text-primary-foreground font-semibold hover:opacity-90 w-fit">
            {changingPassword ? "Changing..." : "Change Password"}
          </Button>
        </div>
        {telegramLink && (
          <p className="text-xs text-muted-foreground">
            Forgot your current password?{" "}
            <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              <Bot className="w-3 h-3" /> Reset via Telegram Bot
            </a>
          </p>
        )}
      </div>

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

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Link className="w-4 h-4 text-primary" /> Telegram Bot</h3>
        <p className="text-sm text-muted-foreground">
          Link your Telegram account to receive notifications and manage your account via bot commands.
        </p>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm">
          <p className="text-muted-foreground">
            Status: <span className={profile?.telegram_linked ? "text-success" : "text-warning"}>
              {profile?.telegram_linked ? "Linked" : "Not linked"}
            </span>
          </p>
          {profile?.telegram_chat_id && (
            <p className="text-xs text-muted-foreground mt-1">Chat ID: {profile.telegram_chat_id}</p>
          )}
        </div>
        {telegramLink ? (
          <a href={telegramLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="border-primary/30 hover:bg-primary/5 hover:border-primary/50">
              <Bot className="w-4 h-4 mr-2" />
              {profile?.telegram_linked ? "Open Telegram Bot" : "Link via Telegram Bot"}
            </Button>
          </a>
        ) : (
          <Button variant="outline" disabled className="border-primary/30">
            {profile?.telegram_linked ? "Unlink Telegram" : "Link Telegram Account"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
