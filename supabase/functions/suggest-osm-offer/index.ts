// Edge Function: suggest-osm-offer
// Generates an AI-suggested offer for an OSM merchant (treated like a Pro merchant in DB).
// Caches results for 2h in public.generated_offers (source='osm', expires_at).
// Public function (no JWT required) so visitors can see suggestions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  merchant_id?: string; // UUID from public.merchants (preferred)
  place_id?: string;    // legacy: osm-XXXX string
  name: string;
  category: string;
  lat: number;
  lng: number;
}

function isValidCoord(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

async function fetchWeather(lat: number, lng: number) {
  const key = Deno.env.get("OPENWEATHER_API_KEY");
  if (!key) return null;
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric&lang=fr`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    return {
      temp: Math.round(j.main?.temp ?? 0),
      condition: j.weather?.[0]?.description ?? "inconnu",
      main: j.weather?.[0]?.main ?? "Clear",
    };
  } catch {
    return null;
  }
}

// Inline lightweight Payone-flow simulator for OSM places (no merchant in DB).
// Uses a category baseline pattern to estimate hourly transaction weight,
// then derives whether the current hour is "off-peak".
const CATEGORY_PATTERNS: Record<string, number[]> = {
  Restaurant:  [0,0,0,0,0,0, 1,2,3,5, 9,18,22,15, 6,4,3,5, 12,20,18,10, 4,1],
  Café:        [0,0,0,0,0,1, 4,12,18,15, 10,8,9,7, 12,10,6,4, 3,2,1,1, 0,0],
  Boulangerie: [0,0,0,0,0,2, 12,22,20,12, 8,14,16,8, 4,3,5,8, 6,3,1,0, 0,0],
  Bar:         [0,0,0,0,0,0, 0,0,0,0, 1,3,5,3, 2,3,5,9, 14,20,22,18, 12,5],
  "Fast-food": [0,0,0,0,0,0, 1,2,3,4, 8,18,20,12, 4,3,4,6, 10,15,14,9, 5,2],
  Boutique:    [0,0,0,0,0,0, 1,2,4,8, 12,14,10,8, 12,14,12,10, 7,4,2,1, 0,0],
};

function simulatePayoneFlow(category: string) {
  const key = Object.keys(CATEGORY_PATTERNS).find(
    (k) => k.toLowerCase() === (category ?? "").toLowerCase(),
  );
  const pattern = CATEGORY_PATTERNS[key ?? ""] ?? [0,0,0,0,0,1, 2,4,6,8, 10,12,14,10, 8,10,12,10, 8,6,4,3, 2,1];
  const counts = pattern.map((w) => Math.max(0, Math.round(w * (1 + (Math.random() * 0.5 - 0.25)))));
  const sorted = [...counts].sort((a, b) => a - b);
  const threshold = sorted[Math.max(0, Math.floor(sorted.length / 3) - 1)];
  const offPeakHours = counts
    .map((c, h) => ({ c, h }))
    .filter((x) => x.c <= threshold)
    .map((x) => x.h);
  const currentHour = new Date().getHours();
  return {
    current_hour: currentHour,
    current_count: counts[currentHour],
    is_currently_off_peak: counts[currentHour] <= threshold,
    off_peak_hours: offPeakHours,
    hourly_counts: counts,
  };
}

function timeContext(): { hour: number; period: string } {
  const h = new Date().getHours();
  let period = "journée";
  if (h >= 6 && h < 11) period = "matin";
  else if (h >= 11 && h < 14) period = "midi";
  else if (h >= 14 && h < 18) period = "après-midi";
  else if (h >= 18 && h < 22) period = "soir";
  else period = "nuit";
  return { hour: h, period };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let body: Body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { merchant_id, place_id, name, category, lat, lng } = body ?? {};
    if (!name || !category || !isValidCoord(lat) || !isValidCoord(lng) || (!merchant_id && !place_id)) {
      return new Response(
        JSON.stringify({ error: "merchant_id (or place_id), name, category, lat, lng required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve merchant UUID — accept either a real UUID or legacy "osm-XXXX" via osm_id lookup
    const isUuid = (s: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    let resolvedMerchantId: string | null = null;
    if (merchant_id && isUuid(merchant_id)) {
      resolvedMerchantId = merchant_id;
    } else {
      const lookupKey = (merchant_id ?? place_id) as string;
      const { data: existing } = await supabase
        .from("merchants")
        .select("id")
        .eq("osm_id", lookupKey)
        .maybeSingle();
      if (existing) {
        resolvedMerchantId = existing.id;
      } else {
        // Create the OSM merchant on the fly
        const { data: created, error: createErr } = await supabase
          .from("merchants")
          .insert({
            osm_id: lookupKey,
            name,
            category,
            lat,
            lng,
            source: "osm",
            owner_id: null,
          })
          .select("id")
          .single();
        if (createErr) {
          console.error("create OSM merchant error:", createErr);
          throw new Error("Impossible d'enregistrer le commerce OSM");
        }
        resolvedMerchantId = created.id;
      }
    }

    // 2h cache lookup
    const { data: cached } = await supabase
      .from("generated_offers")
      .select("id, title, description, discount, context_used, expires_at")
      .eq("merchant_id", resolvedMerchantId)
      .eq("source", "osm")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      const ctx = (cached.context_used ?? {}) as Record<string, unknown>;
      return new Response(JSON.stringify({
        success: true,
        suggested: true,
        cached: true,
        merchant_id: resolvedMerchantId,
        offer: {
          id: cached.id,
          title: cached.title,
          description: cached.description,
          discount: Number(cached.discount),
          rationale: (ctx.rationale as string) ?? "",
        },
        context: ctx,
        expires_at: cached.expires_at,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weather = await fetchWeather(lat, lng);
    const time = timeContext();
    const payoneFlow = simulatePayoneFlow(category);

    const systemPrompt = `Tu es un marketeur local français spécialisé dans le commerce de proximité.
Génère UNE offre promotionnelle suggérée, plausible et contextuelle pour un commerce.
Règles strictes :
- Ton chaleureux, local, naturel.
- Adapte l'offre à la météo (pluie/froid → boisson chaude, abri ; chaleur → boisson fraîche, glace ; soleil → terrasse/à emporter).
- Adapte au moment de la journée (matin → café/viennoiserie ; midi → formule déjeuner ; soir → apéro ; etc.).
- **Flux Payone (très important)** : si l'heure actuelle est une heure creuse (is_currently_off_peak=true), pousse une remise plus agressive (jusqu'à 25%) avec un ton "happy hour / heure creuse". Sinon reste sur 5-15%.
- La remise doit être réaliste (5%-25%).
- Titre < 60 caractères, description 1-2 phrases (< 200 caractères).
- Réponds UNIQUEMENT en français.
- Précise toujours que c'est une "offre suggérée" non encore validée par le commerçant.`;

    const userPrompt = `Commerce :
- Nom : ${name}
- Catégorie : ${category}

Contexte actuel :
- Heure : ${time.hour}h (${time.period})
- Météo : ${weather ? `${weather.temp}°C, ${weather.condition}` : "non disponible"}
- Flux Payone (24h simulé) : ${JSON.stringify(payoneFlow)}

Génère l'offre la plus pertinente possible MAINTENANT, en exploitant l'info d'heure creuse si applicable.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_offer",
            description: "Suggest a contextual offer for a local merchant.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short catchy title in French (< 60 chars)." },
                description: { type: "string", description: "1-2 sentences in French (< 200 chars)." },
                discount: { type: "number", description: "Discount percentage between 5 and 25." },
                rationale: { type: "string", description: "Brief reason this offer fits NOW." },
              },
              required: ["title", "description", "discount", "rationale"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_offer" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes IA, réessaie dans un instant." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      throw new Error(`AI gateway error [${aiRes.status}]`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return a structured offer");
    const offer = JSON.parse(toolCall.function.arguments);

    const safeDiscount = Math.max(5, Math.min(25, Number(offer.discount) || 10));

    const safeTitle = String(offer.title).slice(0, 120);
    const safeDescription = String(offer.description).slice(0, 300);
    const contextUsed = {
      weather,
      time,
      payone_flow: payoneFlow,
      rationale: offer.rationale,
    };
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // +2h

    // Persist to generated_offers (cache)
    let storedId: string | null = null;
    try {
      const { data: stored, error: storeErr } = await supabase
        .from("generated_offers")
        .insert({
          merchant_id: resolvedMerchantId,
          title: safeTitle,
          description: safeDescription,
          discount: safeDiscount,
          status: "active",
          source: "osm",
          context_used: contextUsed,
          expires_at: expiresAt,
        })
        .select("id")
        .single();
      if (storeErr) {
        console.error("store OSM offer error:", storeErr);
      } else {
        storedId = stored?.id ?? null;
      }
    } catch (e) {
      console.error("unexpected store error:", e);
    }

    return new Response(JSON.stringify({
      success: true,
      suggested: true,
      cached: false,
      merchant_id: resolvedMerchantId,
      offer: {
        id: storedId,
        title: safeTitle,
        description: safeDescription,
        discount: safeDiscount,
        rationale: offer.rationale,
      },
      context: contextUsed,
      expires_at: expiresAt,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("suggest-osm-offer error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
