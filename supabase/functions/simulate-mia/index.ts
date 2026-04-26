// Edge Function: simulate-mia
// "Simulate Mia" flow:
//   1. Fetch weather (OpenWeatherMap) for given lat/lng
//   2. Find nearby places via OpenStreetMap Overpass API (no key required) — used as enrichment context
//   3. Pick the closest registered merchant from public.merchants
//   4. Ask Lovable AI (Gemini) to craft ONE contextual offer for that merchant
//   5. Insert the offer into generated_offers with status='active' so the client sees it instantly
//
// Returns: { offer, weather, mood, merchant, places }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body { lat: number; lng: number }

// Haversine distance (meters)
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

function moodFromWeather(w: any, hour: number): "rain" | "sun" | "night" | "rush" {
  const main = (w?.weather?.[0]?.main ?? "").toLowerCase();
  if (hour >= 20 || hour <= 5) return "night";
  if (main.includes("rain") || main.includes("drizzle") || main.includes("thunder") || main.includes("snow")) return "rain";
  if (main.includes("clear") || main.includes("sun")) return "sun";
  if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 20)) return "rush";
  return "sun";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env missing");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
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
    const { lat, lng } = body ?? {};
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "lat and lng (numbers) are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ------- 1) Weather (OpenWeatherMap)
    const weatherUrl =
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}` +
      `&units=metric&lang=fr&appid=${OPENWEATHER_API_KEY}`;

    // ------- 2) Nearby places (OpenStreetMap Overpass — free, no key)
    const overpassQuery = `
      [out:json][timeout:15];
      (
        node["amenity"~"cafe|restaurant|bar|fast_food|ice_cream|pub|bakery"](around:400,${lat},${lng});
        node["shop"~"bakery|convenience|coffee"](around:400,${lat},${lng});
      );
      out body 20;
    `.trim();
    const overpassUrl = "https://overpass-api.de/api/interpreter";

    const [weatherRes, placesRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(overpassUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
          "User-Agent": "JECK-CityWallet/1.0 (contact@jeck.app)",
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      }),
    ]);

    if (!weatherRes.ok) {
      const t = await weatherRes.text();
      throw new Error(`OpenWeatherMap error [${weatherRes.status}]: ${t}`);
    }
    const weatherJson = await weatherRes.json();

    let osmPlaces: any[] = [];
    if (placesRes.ok) {
      const j = await placesRes.json();
      osmPlaces = (j?.elements ?? []).map((el: any) => ({
        id: el.id,
        name: el.tags?.name ?? null,
        type: el.tags?.amenity ?? el.tags?.shop ?? null,
        lat: el.lat,
        lng: el.lon,
      })).filter((p: any) => p.name).slice(0, 15);
    } else {
      console.warn("Overpass error:", placesRes.status);
    }

    const weather = {
      city: weatherJson?.name ?? null,
      country: weatherJson?.sys?.country ?? null,
      temperature: weatherJson?.main?.temp ?? null,
      condition: weatherJson?.weather?.[0]?.main ?? null,
      description: weatherJson?.weather?.[0]?.description ?? null,
      icon: weatherJson?.weather?.[0]?.icon ?? null,
    };

    const localHour = new Date().getUTCHours() + Math.round(((weatherJson?.timezone ?? 0) / 3600));
    const hour = ((localHour % 24) + 24) % 24;
    const mood = moodFromWeather(weatherJson, hour);

    // ------- 3) Pick closest registered merchant — OR fall back to closest OSM place
    const adminClient = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : supabase;
    const { data: merchants, error: merchantsErr } = await adminClient
      .from("merchants")
      .select("*")
      .not("lat", "is", null)
      .not("lng", "is", null);
    if (merchantsErr) throw merchantsErr;

    let chosen: any;
    let distance: number;
    let isOsmFallback = false;

    if (merchants && merchants.length > 0) {
      const ranked = merchants
        .map((m) => ({ m, d: distM(lat, lng, m.lat as number, m.lng as number) }))
        .sort((a, b) => a.d - b.d);
      chosen = ranked[0].m;
      distance = Math.round(ranked[0].d);
    } else {
      // Fallback : aucun commerce inscrit -> on prend le lieu OSM le plus proche
      // et on l'upsert dans public.merchants (source='osm') pour le traiter
      // EXACTEMENT comme un commerce Pro (vrai UUID, offre persistée, acceptation possible).
      const rankedOsm = osmPlaces
        .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
        .map((p) => ({ p, d: distM(lat, lng, p.lat, p.lng) }))
        .sort((a, b) => a.d - b.d);
      if (rankedOsm.length === 0) {
        return new Response(JSON.stringify({ error: "Aucun commerce trouvé autour de vous." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const top = rankedOsm[0];
      const osmIdStr = `osm-${top.p.id}`;
      const categoryGuess = (() => {
        const t = (top.p.type ?? "").toLowerCase();
        if (t === "cafe") return "Café";
        if (t === "restaurant") return "Restaurant";
        if (t === "bar" || t === "pub") return "Bar";
        if (t === "fast_food") return "Fast-food";
        if (t === "bakery") return "Boulangerie";
        if (t === "ice_cream") return "Glacier";
        return "Commerce";
      })();

      // Lookup-then-insert (the unique index on osm_id is partial,
      // so ON CONFLICT can't target it — we emulate upsert manually).
      let upserted: any = null;
      const { data: existing, error: lookupErr } = await adminClient
        .from("merchants")
        .select("*")
        .eq("osm_id", osmIdStr)
        .maybeSingle();
      if (lookupErr) {
        console.error("OSM merchant lookup error:", lookupErr);
        throw new Error("Impossible d'enregistrer le commerce OSM");
      }

      if (existing) {
        const { data: updated, error: updErr } = await adminClient
          .from("merchants")
          .update({
            name: top.p.name,
            category: categoryGuess,
            lat: top.p.lat,
            lng: top.p.lng,
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (updErr) {
          console.error("OSM merchant update error:", updErr);
          throw new Error("Impossible d'enregistrer le commerce OSM");
        }
        upserted = updated;
      } else {
        const { data: inserted, error: insErr } = await adminClient
          .from("merchants")
          .insert({
            osm_id: osmIdStr,
            name: top.p.name,
            category: categoryGuess,
            lat: top.p.lat,
            lng: top.p.lng,
            source: "osm",
            owner_id: null,
            last_seen_at: new Date().toISOString(),
          })
          .select("*")
          .single();
        if (insErr) {
          console.error("OSM merchant insert error:", insErr);
          throw new Error("Impossible d'enregistrer le commerce OSM");
        }
        upserted = inserted;
      }

      chosen = upserted;
      distance = Math.round(top.d);
      isOsmFallback = true;
    }

    // ------- 4) AI generates one contextual offer
    const rules = (chosen.rules ?? {}) as { discount?: number; goals?: string[] };
    const maxDiscount = rules.discount ?? 30;

    const systemPrompt = `Tu es Mia, une marketeur locale IA pour JECK City Wallet.
Tu créés UNE offre courte, chaleureuse, hyper-contextuelle pour le commerce ciblé.
Règles:
- Adapte-toi à la météo: pluie/froid -> abri & boisson chaude; soleil -> rafraîchissant/terrasse; soirée -> ambiance/afterwork.
- Reste crédible: ne propose pas une glace en plein orage.
- Remise entre 5 et ${maxDiscount}%.
- Titre < 60 caractères, description 1 phrase < 180 caractères, en français.`;

    const userPrompt = `Commerce: ${chosen.name} (${chosen.category})
Distance utilisateur: ${distance} m
Heure locale: ${hour}h
Météo: ${weather.description ?? weather.condition}, ${weather.temperature}°C
Ambiance détectée: ${mood}
Concurrents OSM proches: ${osmPlaces.slice(0, 6).map((p) => `${p.name} (${p.type})`).join(", ") || "aucun"}
Objectifs marchand: ${(rules.goals ?? []).join(", ") || "n/a"}

Crée l'offre la plus pertinente MAINTENANT.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_offer",
            description: "Create one contextual offer.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                discount: { type: "number" },
                rationale: { type: "string" },
              },
              required: ["title", "description", "discount", "rationale"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_offer" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
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
      throw new Error(`AI gateway error [${aiRes.status}]: ${t}`);
    }
    const aiJson = await aiRes.json();
    const tool = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!tool?.function?.arguments) throw new Error("AI returned no structured offer");
    const off = JSON.parse(tool.function.arguments) as {
      title: string; description: string; discount: number; rationale: string;
    };
    const safeDiscount = Math.max(0, Math.min(maxDiscount, Number(off.discount) || 0));

    // ------- 5) Insert as ACTIVE offer
    // OSM merchants are now persisted with a real UUID, so the insert flow is identical
    // to Pro merchants. Only difference: source='osm' + 2h expires_at (cache court).
    const offerPayload: Record<string, unknown> = {
      merchant_id: chosen.id,
      title: off.title.slice(0, 120),
      description: off.description?.slice(0, 500) ?? null,
      discount: safeDiscount,
      status: "active",
      source: isOsmFallback ? "osm" : "pro",
      context_used: {
        weather, mood, hour, distance_m: distance,
        osm_places: osmPlaces.slice(0, 8),
        rationale: off.rationale,
        user_lat: lat, user_lng: lng,
        generated_at: new Date().toISOString(),
      },
    };
    if (isOsmFallback) {
      offerPayload.expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    }

    const { data: inserted, error: insertErr } = await adminClient
      .from("generated_offers")
      .insert(offerPayload)
      .select()
      .single();
    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({
      success: true,
      suggested: isOsmFallback,
      offer: inserted,
      merchant: { id: chosen.id, name: chosen.name, category: chosen.category, distance_m: distance },
      weather, mood, places: osmPlaces.slice(0, 8),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("simulate-mia error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
