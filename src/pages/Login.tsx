import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowLeft, Bot, Mail, KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RESEND_SECONDS = 45;

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

  // OTP login flow (alternate to password)
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<number | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["admin-settings-login"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_settings").select("telegram_bot_link, otp_login_enabled").limit(1).maybeSingle();
      return data;
    },
  });

  const otpEnabled = (settings as any)?.otp_login_enabled;
  const telegramLink = (settings as any)?.telegram_bot_link;

  useEffect(() => {
    if (resendIn <= 0) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } return; }
    if (!timerRef.current) timerRef.current = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000) as unknown as number;
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [resendIn]);

  const sendOtp = async () => {
    if (!email) { toast.error("Enter your email first"); return; }
    setOtpSending(true);
    const { data, error } = await supabase.functions.invoke("auth-actions", { body: { action: "request_otp", email, origin: window.location.origin } });
    setOtpSending(false);
    if (error) { toast.error(error.message); return; }
    setOtpSent(true);
    setResendIn(RESEND_SECONDS);
    toast.success("If your email is registered, a 6-digit code was sent.");
  };

  const verifyOtpAndSignIn = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("auth-actions", {
      body: { action: "verify_otp", email, code: otpCode, origin: window.location.origin },
    });
    if (error || !(data as any)?.ok) {
      setLoading(false);
      toast.error((data as any)?.error || error?.message || "Invalid or expired code");
      return;
    }
    // Extract token_hash from the magiclink and verify on the client to create a real session.
    const link: string = (data as any).action_link || "";
    try {
      const u = new URL(link);
      const token_hash = u.searchParams.get("token") || u.searchParams.get("token_hash");
      if (!token_hash) throw new Error("No token in action link");
      const { error: vErr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash, email } as any);
      if (vErr) throw vErr;
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (e: any) {
      toast.error(e?.message || "Could not start session");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (useOtp) {
      if (!otpSent) { await sendOtp(); return; }
      if (otpCode.length !== 6) { toast.error("Enter the 6-digit code"); return; }
      await verifyOtpAndSignIn();
      return;
    }
    setLoading(true);
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="trader@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary/50 border-border focus:border-primary" required disabled={otpSent} />
            </div>

            {!useOtp && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" onClick={() => { setForgotEmail(email); setForgotOpen(true); }} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary/50 border-border focus:border-primary pr-10" required={!useOtp} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {useOtp && otpSent && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> 6-digit code</Label>
                <Input id="otp" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))} className="bg-secondary/50 border-border focus:border-primary tracking-[0.5em] text-center font-mono" required autoFocus />
                <div className="flex items-center justify-between text-xs">
                  <button type="button" onClick={sendOtp} disabled={resendIn > 0 || otpSending} className="text-primary hover:underline disabled:opacity-50 disabled:no-underline">
                    {otpSending ? "Sending…" : resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtpCode(""); setResendIn(0); }} className="text-muted-foreground hover:text-foreground">Use different email</button>
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full gold-gradient text-primary-foreground font-semibold hover:opacity-90 h-11">
              {loading ? "Signing In..." : useOtp ? (otpSent ? "Verify & Sign In" : "Send Code") : "Sign In"}
            </Button>

            {otpEnabled && (
              <button
                type="button"
                onClick={() => { setUseOtp(!useOtp); setOtpSent(false); setOtpCode(""); }}
                className="w-full text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1"
              >
                <ShieldCheck className="w-3 h-3" />
                {useOtp ? "Use password instead" : "Use a one-time email code instead"}
              </button>
            )}
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
            <p className="text-sm text-muted-foreground">Enter your email — if an account exists, we'll send a secure reset link to your inbox.</p>
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
