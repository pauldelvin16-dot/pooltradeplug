import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BIN_BRANDS = [
  { brand: "VISA", bin: "453201" },
  { brand: "MASTERCARD", bin: "545421" },
  { brand: "VISA", bin: "401288" },
];

function luhnCheckDigit(num: string): string {
  let sum = 0, alt = true;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n; alt = !alt;
  }
  const mod = sum % 10;
  return ((10 - mod) % 10).toString();
}

function genCard() {
  const pick = BIN_BRANDS[Math.floor(Math.random() * BIN_BRANDS.length)];
  const body = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join("");
  const partial = pick.bin + body;
  const full = partial + luhnCheckDigit(partial);
  const cvv = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join("");
  const now = new Date();
  const expYear = now.getFullYear() + 4;
  const expMonth = Math.max(1, Math.min(12, now.getMonth() + 1));
  return {
    full, cvv, last4: full.slice(-4), bin: pick.bin, brand: pick.brand,
    exp_month: expMonth, exp_year: expYear,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const auth = req.headers.get("Authorization") || "";
    const supa = createClient(supaUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes } = await supa.auth.getUser();
    if (!userRes?.user) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const admin = createClient(supaUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // ensure master key
    const { data: settings } = await admin.from("admin_settings").select("id,pk_encryption_key").limit(1).maybeSingle();
    let master = settings?.pk_encryption_key as string | null;
    if (!master && settings?.id) {
      const buf = new Uint8Array(48);
      crypto.getRandomValues(buf);
      master = Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
      await admin.from("admin_settings").update({ pk_encryption_key: master }).eq("id", settings.id);
    }
    if (!master) return json({ error: "Encryption key not configured" }, 500);

    if (action === "purchase") {
      // 1. Call purchase_virtual_card RPC as the user
      const { data, error } = await supa.rpc("purchase_virtual_card", { _design: body.design || "aurora" });
      if (error) return json({ error: error.message }, 400);
      const result = data as any;
      if (!result?.ok) return json({ error: result?.error || "Purchase failed" }, 400);

      const card = genCard();
      const { error: provErr } = await admin.rpc("provision_virtual_card", {
        _card_id: result.card_id,
        _full_number: card.full,
        _cvv: card.cvv,
        _last4: card.last4,
        _bin: card.bin,
        _brand: card.brand,
        _exp_month: card.exp_month,
        _exp_year: card.exp_year,
        _master: master,
      });
      if (provErr) return json({ error: provErr.message }, 500);
      return json({ ok: true, card_id: result.card_id, fee: result.fee });
    }

    if (action === "reveal") {
      const { data, error } = await supa.rpc("read_card_secrets", {
        _card_id: body.card_id, _master: master,
      });
      if (error) return json({ error: error.message }, 400);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return json({ error: "Not found" }, 404);
      return json({ ok: true, card_number: row.card_number, cvv: row.cvv });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    return json({ error: e.message || "error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
