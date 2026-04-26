// Edge Function: evaluate-context
// Évalue le contexte (météo + heure + jour + affluence merchant le plus proche)
// et retourne un score, des "reasons" lisibles, et un booléen `trigger`.
// Utilisé par le client pour décider s'il faut déclencher Mia automatiquement.
//
// IMPORTANT: cette function NE génère PAS d'offre. Elle ne fait QUE lire le contexte.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body { lat: number; lng: number; threshold?: number }

function distM(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

interface Reason { icon: string; label: string; weight: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env missing");
    if (!OPENWEATHER_API_KEY) throw new Error("OPENWEATHER_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { lat, lng, threshold = 60 } = body ?? {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- Météo
    const weatherUrl =
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}` +
      `&units=metric&lang=fr&appid=${OPENWEATHER_API_KEY}`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error(`OpenWeatherMap error [${weatherRes.status}]`);
    const weatherJson = await weatherRes.json();

    const condition = (weatherJson?.weather?.[0]?.main ?? "").toLowerCase();
    const description = weatherJson?.weather?.[0]?.description ?? null;
    const temperature = weatherJson?.main?.temp ?? null;
    const city = weatherJson?.name ?? null;

    const localHour = new Date().getUTCHours() + Math.round(((weatherJson?.timezone ?? 0) / 3600));
    const hour = ((localHour % 24) + 24) % 24;
    const dayOfWeek = new Date().getUTCDay(); // 0=dim
    const dayLabels = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

    // ----- Merchant le plus proche + son affluence (payone_transaction_flow)
    const adminClient = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : supabase;

    const { data: merchants } = await adminClient
      .from("merchants")
      .select("id, name, category, lat, lng")
      .not("lat", "is", null)
      .not("lng", "is", null);

    let nearestMerchant: { id: string; name: string; category: string; distance_m: number } | null = null;
    let isOffPeak = false;
    let merchantFlow: { transaction_count: number; avg_basket: number } | null = null;

    if (merchants && merchants.length > 0) {
      const ranked = merchants
        .map((m) => ({ m, d: distM(lat, lng, m.lat as number, m.lng as number) }))
        .sort((a, b) => a.d - b.d);
      const top = ranked[0];
      nearestMerchant = {
        id: top.m.id as string,
        name: top.m.name as string,
        category: top.m.category as string,
        distance_m: Math.round(top.d),
      };

      // Flow de la dernière heure pour ce marchand
      const { data: flow } = await adminClient
        .from("payone_transaction_flow")
        .select("transaction_count, avg_basket, is_off_peak, hour_slot, recorded_for")
        .eq("merchant_id", nearestMerchant.id)
        .order("recorded_for", { ascending: false })
        .order("hour_slot", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (flow) {
        isOffPeak = !!flow.is_off_peak;
        merchantFlow = {
          transaction_count: Number(flow.transaction_count ?? 0),
          avg_basket: Number(flow.avg_basket ?? 0),
        };
      }
    }

    // ----- Construction du score
    const reasons: Reason[] = [];
    let score = 0;

    // Météo défavorable -> les gens cherchent un abri
    if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunder")) {
      reasons.push({ icon: "☔", label: `Pluie à ${city ?? "votre quartier"}`, weight: 35 });
      score += 35;
    } else if (condition.includes("snow")) {
      reasons.push({ icon: "❄️", label: "Neige", weight: 30 });
      score += 30;
    } else if (typeof temperature === "number" && temperature >= 26) {
      reasons.push({ icon: "☀️", label: `${Math.round(temperature)}°C — envie de fraîcheur`, weight: 20 });
      score += 20;
    } else if (typeof temperature === "number" && temperature <= 5) {
      reasons.push({ icon: "🥶", label: `${Math.round(temperature)}°C — envie de chaud`, weight: 25 });
      score += 25;
    }

    // Plage horaire creuse pour le commerce (hors rush)
    if (hour >= 14 && hour <= 17) {
      reasons.push({ icon: "🕒", label: `${dayLabels[dayOfWeek]} ${hour}h — creux d'après-midi`, weight: 25 });
      score += 25;
    } else if (hour >= 10 && hour <= 11) {
      reasons.push({ icon: "🕒", label: `${dayLabels[dayOfWeek]} ${hour}h — pause matinale`, weight: 15 });
      score += 15;
    }

    // Jours plus calmes en semaine (mardi/mercredi)
    if (dayOfWeek === 2 || dayOfWeek === 3) {
      reasons.push({ icon: "📅", label: `${dayLabels[dayOfWeek]} — journée calme`, weight: 10 });
      score += 10;
    }

    // Faible affluence chez le commerce le plus proche
    if (isOffPeak) {
      reasons.push({
        icon: "📉",
        label: nearestMerchant
          ? `${nearestMerchant.name} en faible affluence`
          : "Faible affluence",
        weight: 30,
      });
      score += 30;
    }

    // Proximité immédiate
    if (nearestMerchant && nearestMerchant.distance_m <= 200) {
      reasons.push({
        icon: "📍",
        label: `${nearestMerchant.name} à ${nearestMerchant.distance_m} m`,
        weight: 15,
      });
      score += 15;
    } else if (nearestMerchant && nearestMerchant.distance_m <= 500) {
      reasons.push({
        icon: "📍",
        label: `${nearestMerchant.name} à ${nearestMerchant.distance_m} m`,
        weight: 5,
      });
      score += 5;
    }

    const trigger = score >= threshold && !!nearestMerchant;

    return new Response(JSON.stringify({
      success: true,
      trigger,
      score,
      threshold,
      reasons,
      context: {
        weather: { description, temperature, city, condition },
        hour,
        day: dayLabels[dayOfWeek],
        merchant: nearestMerchant,
        flow: merchantFlow,
        is_off_peak: isOffPeak,
      },
      evaluated_at: new Date().toISOString(),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("evaluate-context error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
