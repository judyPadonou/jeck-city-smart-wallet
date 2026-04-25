// Edge Function: generate-offer
// 1. Loads merchant + its rules
// 2. Calls fetch-city-context internally to get weather + nearby places
// 3. Asks Lovable AI (Gemini) to play a local marketer and craft an offer
// 4. Inserts the offer into generated_offers (status: draft by default)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  merchant_id: string;
  lat?: number;
  lng?: number;
  status?: "draft" | "active";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Supabase env not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Forward caller's auth so RLS applies
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: Body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body?.merchant_id) {
      return new Response(JSON.stringify({ error: "merchant_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Load merchant (RLS ensures the caller is the owner)
    const { data: merchant, error: merchantErr } = await supabase
      .from("merchants").select("*").eq("id", body.merchant_id).maybeSingle();
    if (merchantErr) throw merchantErr;
    if (!merchant) {
      return new Response(JSON.stringify({ error: "Merchant not found or not authorized" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lat = body.lat ?? merchant.lat;
    const lng = body.lng ?? merchant.lng;

    // 2) Get city context (weather + nearby places)
    let context: any = null;
    if (typeof lat === "number" && typeof lng === "number") {
      const ctxRes = await fetch(`${SUPABASE_URL}/functions/v1/fetch-city-context`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": authHeader },
        body: JSON.stringify({ lat, lng }),
      });
      if (ctxRes.ok) {
        context = await ctxRes.json();
      } else {
        console.warn("fetch-city-context failed:", ctxRes.status, await ctxRes.text());
      }
    }

    // 3) Build prompt + call Lovable AI Gateway with structured tool-calling
    const rules = (merchant.rules ?? {}) as { discount?: number; goals?: string[]; auto?: boolean };

    const systemPrompt = `Tu es un marketeur local expert, spécialisé dans le marketing contextuel pour petits commerces.
Ta mission : générer UNE offre promotionnelle courte, crédible, immédiatement actionnable, qui répond au contexte météo et au quartier.
Règles:
- Le ton doit être chaleureux, local, naturel (pas de jargon marketing).
- L'offre doit s'appuyer sur la météo: pluie/froid -> abri + boisson chaude; chaleur -> boisson fraîche, terrasse; soleil -> à emporter, terrasse...
- Tiens compte de la catégorie du commerce et des concurrents proches pour te différencier.
- La remise doit rester dans une fourchette raisonnable (5%-${rules.discount ?? 30}%).
- Le titre doit faire moins de 60 caractères.
- La description doit faire 1 à 2 phrases (max 220 caractères).
- Réponds UNIQUEMENT en français.`;

    const userPrompt = `Commerce:
- Nom: ${merchant.name}
- Catégorie: ${merchant.category}
- Objectifs marketing: ${(rules.goals ?? []).join(", ") || "non précisés"}
- Remise max autorisée: ${rules.discount ?? 30}%

Contexte météo / lieu (JSON):
${JSON.stringify(context ?? { note: "Pas de coordonnées disponibles" }, null, 2)}

Génère maintenant l'offre la plus pertinente possible pour MAINTENANT.`;

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
            name: "create_offer",
            description: "Create a contextual local marketing offer.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Catchy title, < 60 chars, in French." },
                description: { type: "string", description: "1-2 sentences, < 220 chars, in French." },
                discount: { type: "number", description: "Discount percentage, 5 to 50." },
                rationale: { type: "string", description: "Brief reason this offer fits the current context." },
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
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoute des crédits dans Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiRes.status, t);
      throw new Error(`AI gateway error [${aiRes.status}]`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return a structured offer");
    }
    const offer = JSON.parse(toolCall.function.arguments) as {
      title: string; description: string; discount: number; rationale: string;
    };

    // Clamp discount to merchant rule
    const maxDiscount = rules.discount ?? 30;
    const safeDiscount = Math.max(0, Math.min(maxDiscount, Number(offer.discount) || 0));

    // 4) Insert into generated_offers
    const status = body.status === "active" ? "active" : "draft";
    const { data: inserted, error: insertErr } = await supabase
      .from("generated_offers")
      .insert({
        merchant_id: merchant.id,
        title: offer.title.slice(0, 120),
        description: offer.description?.slice(0, 500) ?? null,
        discount: safeDiscount,
        status,
        context_used: {
          weather: context?.weather ?? null,
          places: context?.places ?? null,
          rationale: offer.rationale,
          rules_snapshot: rules,
          generated_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return new Response(JSON.stringify({ success: true, offer: inserted, rationale: offer.rationale }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-offer error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
