// Edge Function: simulate-payone-flow
// Simulates a 24h Payone transaction flow for one or several merchants.
// - For each merchant, generates 24 hourly slots (0..23) with transaction_count, total_amount, avg_basket
// - Marks the bottom-third (lowest activity) hours as is_off_peak = true
// - Upserts into payone_transaction_flow for today (recorded_for = current date)
// Public function (no JWT) so it can be triggered by a cron or by the client to refresh data.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  merchant_id?: string; // simulate for one merchant, otherwise all
}

// Per-category baseline pattern: relative weight per hour 0..23
// Higher value = more transactions expected.
const CATEGORY_PATTERNS: Record<string, number[]> = {
  // restaurants peak at lunch + dinner
  Restaurant: [0,0,0,0,0,0, 1,2,3,5, 9,18,22,15, 6,4,3,5, 12,20,18,10, 4,1],
  // cafés peak in the morning + mid-afternoon
  Café:        [0,0,0,0,0,1, 4,12,18,15, 10,8,9,7, 12,10,6,4, 3,2,1,1, 0,0],
  // bakeries peak in the early morning + lunch
  Boulangerie: [0,0,0,0,0,2, 12,22,20,12, 8,14,16,8, 4,3,5,8, 6,3,1,0, 0,0],
  // bars peak in the evening
  Bar:         [0,0,0,0,0,0, 0,0,0,0, 1,3,5,3, 2,3,5,9, 14,20,22,18, 12,5],
  // fast food peak at lunch + late evening
  "Fast-food": [0,0,0,0,0,0, 1,2,3,4, 8,18,20,12, 4,3,4,6, 10,15,14,9, 5,2],
  // shops: spread over the day, small midday dip
  Boutique:    [0,0,0,0,0,0, 1,2,4,8, 12,14,10,8, 12,14,12,10, 7,4,2,1, 0,0],
};

function patternFor(category: string): number[] {
  const key = Object.keys(CATEGORY_PATTERNS).find(
    (k) => k.toLowerCase() === (category ?? "").toLowerCase(),
  );
  // generic balanced day pattern as fallback
  return CATEGORY_PATTERNS[key ?? ""] ?? [0,0,0,0,0,1, 2,4,6,8, 10,12,14,10, 8,10,12,10, 8,6,4,3, 2,1];
}

function jitter(base: number, amplitude = 0.35): number {
  // ±amplitude random variation
  const factor = 1 + (Math.random() * 2 - 1) * amplitude;
  return Math.max(0, base * factor);
}

function simulateMerchant(merchantId: string, category: string) {
  const pattern = patternFor(category);
  const counts: number[] = pattern.map((w) => Math.round(jitter(w)));

  // Determine off-peak threshold: hours in the bottom third of activity
  const sorted = [...counts].sort((a, b) => a - b);
  const thresholdIdx = Math.floor(sorted.length / 3); // ~8 hours
  const threshold = sorted[Math.max(0, thresholdIdx - 1)];

  return Array.from({ length: 24 }, (_, h) => {
    const count = counts[h];
    const avgBasket = +(jitter(15, 0.4) + 5).toFixed(2); // 5–25 € roughly
    const total = +(count * avgBasket).toFixed(2);
    const isOffPeak = count > 0 ? count <= threshold : true; // sleeping hours = off-peak
    return {
      merchant_id: merchantId,
      hour_slot: h,
      transaction_count: count,
      total_amount: total,
      avg_basket: avgBasket,
      is_off_peak: isOffPeak,
      recorded_for: new Date().toISOString().slice(0, 10),
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Supabase env not configured");

    let body: Body = {};
    try { body = await req.json(); } catch { /* allow empty body */ }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Load merchants to simulate
    let merchantsQuery = admin.from("merchants").select("id, category");
    if (body.merchant_id) merchantsQuery = merchantsQuery.eq("id", body.merchant_id);
    const { data: merchants, error: merchantsErr } = await merchantsQuery;
    if (merchantsErr) throw merchantsErr;

    if (!merchants || merchants.length === 0) {
      return new Response(JSON.stringify({ success: true, simulated: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const merchantIds = merchants.map((m) => m.id);

    // Wipe today's rows for these merchants then re-insert (avoids stale slots)
    const { error: delErr } = await admin
      .from("payone_transaction_flow")
      .delete()
      .in("merchant_id", merchantIds)
      .eq("recorded_for", today);
    if (delErr) throw delErr;

    const rows = merchants.flatMap((m) => simulateMerchant(m.id, m.category ?? ""));
    const { error: insertErr } = await admin.from("payone_transaction_flow").insert(rows);
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      success: true,
      simulated: merchants.length,
      slots_inserted: rows.length,
      recorded_for: today,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("simulate-payone-flow error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
