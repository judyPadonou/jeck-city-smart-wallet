// Edge Function: suggest-osm-offer
// Generates an AI-suggested offer for an OSM place (no merchant account required).
// Uses category + weather + current hour to craft a contextual French offer.
// Public function (no JWT required) so visitors can see suggestions.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  place_id: string;
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

    const { place_id, name, category, lat, lng } = body ?? {};
    if (!place_id || !name || !category || !isValidCoord(lat) || !isValidCoord(lng)) {
      return new Response(
        JSON.stringify({ error: "place_id, name, category, lat, lng required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const weather = await fetchWeather(lat, lng);
    const time = timeContext();

    const systemPrompt = `Tu es un marketeur local français spécialisé dans le commerce de proximité.
Génère UNE offre promotionnelle suggérée, plausible et contextuelle pour un commerce.
Règles strictes :
- Ton chaleureux, local, naturel.
- Adapte l'offre à la météo (pluie/froid → boisson chaude, abri ; chaleur → boisson fraîche, glace ; soleil → terrasse/à emporter).
- Adapte au moment de la journée (matin → café/viennoiserie ; midi → formule déjeuner ; soir → apéro ; etc.).
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

Génère l'offre la plus pertinente possible MAINTENANT.`;

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

    return new Response(JSON.stringify({
      success: true,
      suggested: true,
      place_id,
      offer: {
        title: String(offer.title).slice(0, 120),
        description: String(offer.description).slice(0, 300),
        discount: safeDiscount,
        rationale: offer.rationale,
      },
      context: { weather, time },
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
