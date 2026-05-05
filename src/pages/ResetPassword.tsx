import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, KeyRound, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  // Consume tokens from BOTH the URL hash (#access_token=…&refresh_token=…&type=recovery)
  // and the query string (?code=… PKCE flow). Confirm a session exists before allowing update.
  useEffect(() => {
    let cancelled = false;

    const finalize = async () => {
      // 1) Already have a session? (e.g. supabase-js auto-parsed the hash)
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) { if (!cancelled) setReady(true); return; }

      // 2) PKCE recovery: ?code=...
      const code = params.get("code");
      if (code) {
        const { data, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr || !data.session) {
          if (!cancelled) setError(exErr?.message || "Invalid or expired reset link");
          return;
        }
        if (!cancelled) setReady(true);
        return;
      }

      // 3) Implicit recovery: hash carries access_token / refresh_token
      const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
      if (hash) {
        const hp = new URLSearchParams(hash);
        const access_token = hp.get("access_token");
        const refresh_token = hp.get("refresh_token");
        if (access_token && refresh_token) {
          const { data, error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setErr || !data.session) {
            if (!cancelled) setError(setErr?.message || "Could not establish reset session");
            return;
          }
          if (!cancelled) setReady(true);
          return;
        }
        const errDesc = hp.get("error_description") || hp.get("error");
        if (errDesc) { if (!cancelled) setError(errDesc); return; }
      }

      if (!cancelled) setError("Open this page from the password-reset link in your email.");
    };

    finalize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (pwd !== confirm) { toast.error("Passwords do not match"); return; }

    // Re-confirm we still have a usable session before updating.
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { toast.error("Reset session expired — request a new link."); return; }

    setSaving(true);
    const { error: upErr } = await supabase.auth.updateUser({ password: pwd });
    setSaving(false);
    if (upErr) { toast.error(upErr.message); return; }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsla(43,96%,56%,0.06),transparent_60%)]" />
      <div className="w-full max-w-md relative animate-slide-up">
        <button onClick={() => navigate("/login")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </button>
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <KeyRound className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-display font-bold gold-text">Set a new password</h1>
            <p className="text-sm text-muted-foreground mt-2">Choose a strong password for your account</p>
          </div>

          {error ? (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" /> {error}
              </div>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>Request a new reset link</Button>
            </div>
          ) : !ready ? (
            <p className="text-sm text-center text-muted-foreground">Verifying reset link…</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>New password</Label>
                <div className="relative">
                  <Input type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)} className="bg-secondary/50 border-border pr-10" required />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-secondary/50 border-border" required />
              </div>
              <Button type="submit" disabled={saving} className="w-full gold-gradient text-primary-foreground font-semibold h-11">
                {saving ? "Updating…" : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
