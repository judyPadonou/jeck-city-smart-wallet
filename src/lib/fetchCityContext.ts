import { supabase } from "@/integrations/supabase/client";

export interface CityContextWeather {
  city: string | null;
  country: string | null;
  temperature: number | null;
  feels_like: number | null;
  humidity: number | null;
  wind_speed: number | null;
  condition: string | null;
  description: string | null;
  icon: string | null;
  timestamp: number | null;
}

export interface CityContextPlace {
  id: string;
  name: string | null;
  address: string | null;
  primary_type: string | null;
  types: string[];
  location: { latitude: number; longitude: number } | null;
  rating: number | null;
  user_rating_count: number | null;
}

export interface CityContextResponse {
  success: boolean;
  input: { lat: number; lng: number; radius: number };
  weather: CityContextWeather;
  places: CityContextPlace[];
  fetched_at: string;
}

/**
 * Fetch contextual data (weather + nearby places) for a given coordinate.
 * Calls the `fetch-city-context` Edge Function.
 */
export async function fetchCityContext(
  lat: number,
  lng: number,
  radius?: number,
): Promise<CityContextResponse> {
  const { data, error } = await supabase.functions.invoke("fetch-city-context", {
    body: { lat, lng, radius },
  });

  if (error) {
    throw new Error(error.message ?? "Failed to fetch city context");
  }
  if (!data?.success) {
    throw new Error(data?.error ?? "Unknown error from fetch-city-context");
  }
  return data as CityContextResponse;
}
