import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await supa.auth.getUser();
    let isAdmin = false;
    if (userRes?.user) {
      const { data: roles } = await supa.from("user_roles").select("role").eq("user_id", userRes.user.id);
      isAdmin = (roles || []).some((r: any) => r.role === "admin");
    }

    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || "").trim();
    const requestOrigin = (req.headers.get("origin") || req.headers.get("referer") || "").replace(/\/[^/]*$/, "").replace(/\/$/, "");
    const requestedOrigins = Array.from(new Set((body.origins || []).map((o: string) => String(o || "").replace(/\/$/, "")).filter(Boolean)));
    const origins = isAdmin ? requestedOrigins : [requestOrigin].filter(Boolean);
    if (!/^[a-f0-9]{32}$/i.test(projectId)) return json({ ok: false, error: "Invalid WalletConnect Project ID format" }, 200);
    if (!origins.length) return json({ ok: false, error: "No origins supplied" }, 200);

    const checks = [];
    for (const origin of origins.slice(0, 8)) {
      try {
        const url = `https://api.web3modal.org/appkit/v1/config?projectId=${projectId}&st=appkit&sv=html-core-1.7.8`;
        const res = await fetch(url, { headers: { Origin: origin, "User-Agent": "TradeLux-Web3-Diagnostics" } });
        const text = await res.text().catch(() => "");
        checks.push({
          origin,
          allowlisted: res.ok,
          status: res.status,
          message: res.ok ? "Allowed" : text.slice(0, 180) || `HTTP ${res.status}`,
        });
      } catch (e: any) {
        checks.push({ origin, allowlisted: false, status: 0, message: e?.message || "Network check failed" });
      }
    }
    return json({ ok: true, allAllowed: checks.every((c) => c.allowlisted), checks });
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 200);
  }
});