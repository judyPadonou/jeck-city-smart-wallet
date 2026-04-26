// Edge Function: fetch-nearby-places
// Returns merchants/places within a given radius (km) around lat/lng using Overpass API (OpenStreetMap).
// Persists OSM results into the public.merchants table (source='osm') so they're treated
// exactly like Pro merchants by the rest of the system (offers, payone flow, etc.).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  lat: number;
  lng: number;
  radiusKm?: number;
}

function isValidCoord(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function categorize(tags: Record<string, string>): string {
  if (tags.amenity === "cafe") return "Café";
  if (tags.amenity === "restaurant") return "Restaurant";
  if (tags.amenity === "bar" || tags.amenity === "pub") return "Bar";
  if (tags.amenity === "fast_food") return "Fast-food";
  if (tags.shop === "bakery") return "Boulangerie";
  if (tags.shop) return "Boutique";
  return "Commerce";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: Body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { lat, lng, radiusKm = 30 } = body ?? {};
    if (
      !isValidCoord(lat) ||
      !isValidCoord(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return new Response(
        JSON.stringify({ error: "lat and lng must be valid numbers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const safeRadius = Math.max(1, Math.min(50, Number(radiusKm) || 30));
    const radiusMeters = Math.round(safeRadius * 1000);

    // Overpass QL — fetch cafes, restaurants, bars, bakeries, shops within radius
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"~"^(cafe|restaurant|bar|pub|fast_food)$"](around:${radiusMeters},${lat},${lng});
        node["shop"~"^(bakery|convenience|clothes|gift|books)$"](around:${radiusMeters},${lat},${lng});
      );
      out body 200;
    `.trim();

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "JECK-CityWallet/1.0 (lovable.app)",
        Accept: "application/json",
      },
      body: "data=" + encodeURIComponent(query),
    });

    if (!overpassRes.ok) {
      const txt = await overpassRes.text();
      throw new Error(`Overpass error [${overpassRes.status}]: ${txt.slice(0, 200)}`);
    }

    const json = await overpassRes.json();
    const elements: any[] = json?.elements ?? [];

    const rawPlaces = elements
      .filter((e) => e.lat && e.lon && e.tags?.name)
      .map((e) => {
        const distance = haversine(lat, lng, e.lat, e.lon);
        return {
          osm_id: `osm-${e.id}`,
          name: e.tags.name as string,
          category: categorize(e.tags),
          lat: e.lat as number,
          lng: e.lon as number,
          address:
            [e.tags["addr:housenumber"], e.tags["addr:street"], e.tags["addr:city"]]
              .filter(Boolean)
              .join(" ") || null,
          distance_km: Math.round(distance * 100) / 100,
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 100);

    // Upsert OSM places into public.merchants so they have a stable UUID
    // and behave like Pro merchants for the rest of the system.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const upsertRows = rawPlaces.map((p) => ({
      osm_id: p.osm_id,
      name: p.name,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      source: "osm",
      owner_id: null,
      last_seen_at: new Date().toISOString(),
    }));

    let merchantsById = new Map<string, string>(); // osm_id -> uuid
    if (upsertRows.length > 0) {
      const { data: upserted, error: upsertErr } = await supabase
        .from("merchants")
        .upsert(upsertRows, { onConflict: "osm_id", ignoreDuplicates: false })
        .select("id, osm_id");

      if (upsertErr) {
        console.error("merchants upsert error:", upsertErr);
      } else if (upserted) {
        for (const m of upserted) {
          if (m.osm_id) merchantsById.set(m.osm_id, m.id);
        }
      }
    }

    // If upsert returned nothing for some rows (rare), backfill by select
    const missing = rawPlaces.filter((p) => !merchantsById.has(p.osm_id)).map((p) => p.osm_id);
    if (missing.length > 0) {
      const { data: fetched } = await supabase
        .from("merchants")
        .select("id, osm_id")
        .in("osm_id", missing);
      for (const m of fetched ?? []) {
        if (m.osm_id) merchantsById.set(m.osm_id, m.id);
      }
    }

    const places = rawPlaces.map((p) => ({
      id: merchantsById.get(p.osm_id) ?? p.osm_id, // UUID from DB, fallback to osm string
      osm_id: p.osm_id,
      merchant_id: merchantsById.get(p.osm_id) ?? null,
      source: "osm",
      name: p.name,
      category: p.category,
      lat: p.lat,
      lng: p.lng,
      address: p.address,
      distance_km: p.distance_km,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        input: { lat, lng, radiusKm: safeRadius },
        count: places.length,
        places,
        fetched_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("fetch-nearby-places error:", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
