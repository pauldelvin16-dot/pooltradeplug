import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MailX, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-unsubscribe`;

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [state, setState] = useState<"loading" | "confirm" | "done" | "invalid">("loading");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`${FUNCTIONS_URL}?token=${encodeURIComponent(token)}`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) { setState("invalid"); return; }
        setEmail(j.email);
        setState(j.already ? "done" : "confirm");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  const confirm = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("email-unsubscribe", { body: { token } });
    setSaving(false);
    if (error || !(data as any)?.ok) { setState("invalid"); return; }
    setState("done");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card p-8 w-full max-w-md text-center space-y-4">
        {state === "loading" && <p className="text-sm text-muted-foreground">Checking your link…</p>}

        {state === "confirm" && (
          <>
            <MailX className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-xl font-display font-bold gold-text">Unsubscribe {email}?</h1>
            <p className="text-sm text-muted-foreground">
              You will stop receiving updates and notifications. Security emails (password resets and login codes) will still be delivered.
            </p>
            <Button onClick={confirm} disabled={saving} className="w-full gold-gradient text-primary-foreground font-semibold">
              {saving ? "Updating…" : "Confirm unsubscribe"}
            </Button>
          </>
        )}

        {state === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
            <h1 className="text-xl font-display font-bold gold-text">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">{email} will no longer receive marketing or notification emails.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Back to home</Button>
          </>
        )}

        {state === "invalid" && (
          <>
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <h1 className="text-xl font-display font-bold">Link not valid</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has already been used.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Back to home</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
