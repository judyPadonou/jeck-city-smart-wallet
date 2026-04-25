// Edge Function: fetch-city-context
// Takes { lat, lng } and returns weather (OpenWeatherMap) + nearby places (Google Places API New)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  lat: number;
  lng: number;
  radius?: number; // meters, default 500
}

function isValidCoord(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");
    const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!OPENWEATHER_API_KEY) {
      throw new Error("OPENWEATHER_API_KEY is not configured");
    }
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured");
    }

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { lat, lng, radius = 500 } = body ?? {};
    if (!isValidCoord(lat) || !isValidCoord(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(
        JSON.stringify({ error: "lat and lng must be valid numbers (lat: -90..90, lng: -180..180)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const safeRadius = Math.max(50, Math.min(5000, Number(radius) || 500));

    // 1) OpenWeatherMap — Current Weather
    const weatherUrl =
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}` +
      `&units=metric&lang=fr&appid=${OPENWEATHER_API_KEY}`;

    // 2) Google Places API (New) — Nearby Search
    const placesUrl = "https://places.googleapis.com/v1/places:searchNearby";
    const placesBody = {
      includedTypes: ["restaurant", "cafe", "bakery", "bar", "store"],
      maxResultCount: 15,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: safeRadius,
        },
      },
    };

    const [weatherRes, placesRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(placesUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.types,places.location,places.rating,places.userRatingCount,places.primaryType",
        },
        body: JSON.stringify(placesBody),
      }),
    ]);

    if (!weatherRes.ok) {
      const txt = await weatherRes.text();
      throw new Error(`OpenWeatherMap error [${weatherRes.status}]: ${txt}`);
    }
    if (!placesRes.ok) {
      const txt = await placesRes.text();
      throw new Error(`Google Places error [${placesRes.status}]: ${txt}`);
    }

    const weatherJson = await weatherRes.json();
    const placesJson = await placesRes.json();

    const weather = {
      city: weatherJson?.name ?? null,
      country: weatherJson?.sys?.country ?? null,
      temperature: weatherJson?.main?.temp ?? null,
      feels_like: weatherJson?.main?.feels_like ?? null,
      humidity: weatherJson?.main?.humidity ?? null,
      wind_speed: weatherJson?.wind?.speed ?? null,
      condition: weatherJson?.weather?.[0]?.main ?? null,
      description: weatherJson?.weather?.[0]?.description ?? null,
      icon: weatherJson?.weather?.[0]?.icon ?? null,
      timestamp: weatherJson?.dt ?? null,
    };

    const places = (placesJson?.places ?? []).map((p: any) => ({
      id: p.id,
      name: p.displayName?.text ?? null,
      address: p.formattedAddress ?? null,
      primary_type: p.primaryType ?? null,
      types: p.types ?? [],
      location: p.location ?? null,
      rating: p.rating ?? null,
      user_rating_count: p.userRatingCount ?? null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        input: { lat, lng, radius: safeRadius },
        weather,
        places,
        fetched_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("fetch-city-context error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
