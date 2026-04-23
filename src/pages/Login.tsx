import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Bot, Mail, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot-password modal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSending, setForgotSending] = useState(false);

  // OTP login flow
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["admin-settings-login"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("telegram_bot_link, otp_login_enabled").limit(1).maybeSingle();
      return data;
    },
  });

  const otpEnabled = (settings as any)?.otp_login_enabled;
  const telegramLink = (settings as any)?.telegram_bot_link;

  const sendOtp = async (em: string) => {
    setOtpSending(true);
    await supabase.functions.invoke("auth-actions", { body: { action: "request_otp", email: em } });
    setOtpSending(false);
    toast.success("If your email is registered, an OTP has been sent.");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (otpEnabled && !otpRequired) {
      // First step: request OTP, don't sign in yet
      await sendOtp(email);
      setOtpRequired(true);
      setLoading(false);
      return;
    }

    if (otpEnabled && otpRequired) {
      const { data, error } = await supabase.functions.invoke("auth-actions", { body: { action: "verify_otp", email, code: otpCode } });
      if (error || !(data as any)?.ok) {
        toast.error("Invalid or expired OTP code");
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back!"); navigate("/dashboard"); }
  };

  const submitForgot = async () => {
    setForgotSending(true);
    await supabase.functions.invoke("auth-actions", { body: { action: "forgot_password", email: forgotEmail, origin: window.location.origin } });
    setForgotSending(false);
    setForgotOpen(false);
    toast.success("If an account exists for that email, a reset link has been sent.");
    setForgotEmail("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(43,96%,56%,0.06),transparent_60%)]" />
      <div className="w-full max-w-md relative animate-slide-up">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>

        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold gold-text">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-2">Sign in to your trading account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="trader@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary/50 border-border focus:border-primary" required disabled={otpRequired} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary/50 border-border focus:border-primary pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {otpEnabled && otpRequired && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> OTP Code (sent to email)</Label>
                <Input id="otp" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="bg-secondary/50 border-border focus:border-primary tracking-[0.5em] text-center font-mono" required />
                <button type="button" onClick={() => sendOtp(email)} disabled={otpSending} className="text-xs text-primary hover:underline">
                  {otpSending ? "Sending..." : "Resend code"}
                </button>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11">
              {loading ? "Signing In..." : (otpEnabled && !otpRequired ? "Continue" : "Sign In")}
            </Button>
          </form>

          {telegramLink && (
            <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border text-center">
              <p className="text-xs text-muted-foreground">
                Prefer Telegram?{" "}
                <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Open our bot
                </a>{" "}
                and send <code className="text-primary">/resetpassword</code>
              </p>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button onClick={() => navigate("/signup")} className="text-primary hover:underline">Create one</button>
          </div>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter your email — if an account exists, we'll send a reset link.</p>
            <Input type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} className="bg-secondary/50 border-border" />
            <Button onClick={submitForgot} disabled={!forgotEmail || forgotSending} className="w-full gold-gradient text-primary-foreground font-semibold">
              {forgotSending ? "Sending..." : "Send Reset Link"}
            </Button>
            {telegramLink && (
              <p className="text-xs text-muted-foreground text-center">
                Or use Telegram: <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">open the bot</a>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
