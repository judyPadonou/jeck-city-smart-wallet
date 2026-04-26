import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2, AlertCircle, Sparkles, X, Store, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileShell } from "@/components/jeck/MobileShell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

interface NearbyPlace {
  id: string;            // UUID from public.merchants (or osm-XXXX fallback)
  osm_id?: string;
  merchant_id?: string | null;
  source?: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
  distance_km: number;
}

interface SuggestedOffer {
  title: string;
  description: string;
  discount: number;
  rationale: string;
}

const createIcon = (emoji: string) =>
  L.divIcon({
    className: "jeck-marker",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:40px;height:40px;border-radius:14px;
      background:linear-gradient(135deg,hsl(var(--primary)),hsl(var(--primary)/0.7));
      color:#fff;font-size:20px;
      box-shadow:0 6px 16px -4px hsl(var(--primary)/0.5);
      border:3px solid #fff;
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const categoryEmoji = (cat: string) => {
  const c = cat.toLowerCase();
  if (c.includes("café") || c.includes("cafe")) return "☕";
  if (c.includes("rest")) return "🍽️";
  if (c.includes("bar")) return "🍸";
  if (c.includes("boul") || c.includes("bake")) return "🥐";
  if (c.includes("fast")) return "🍔";
  if (c.includes("bout") || c.includes("shop") || c.includes("store")) return "🛍️";
  return "📍";
};

const MapPage = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // Suggestion modal state
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestedOffer | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Géolocalisation non disponible sur cet appareil.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lng = p.coords.longitude;
        setUserPos([lat, lng]);

        try {
          const { data, error: fnError } = await supabase.functions.invoke(
            "fetch-nearby-places",
            { body: { lat, lng, radiusKm: 7 } },
          );
          if (fnError) throw new Error(fnError.message);
          if (!data?.success) throw new Error(data?.error ?? "Erreur inconnue");
          setPlaces(data.places ?? []);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erreur de chargement");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Impossible d'obtenir votre position. Autorisez la géolocalisation.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (userPos) return userPos;
    return [48.8566, 2.3522];
  }, [userPos]);

  async function openSuggestion(place: NearbyPlace) {
    setSelectedPlace(place);
    setSuggestion(null);
    setSuggestError(null);
    setSuggestLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "suggest-osm-offer",
        {
          body: {
            merchant_id: place.merchant_id ?? place.id,
            place_id: place.osm_id ?? place.id,
            name: place.name,
            category: place.category,
            lat: place.lat,
            lng: place.lng,
          },
        },
      );
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "Erreur IA");
      setSuggestion(data.offer);
    } catch (e) {
      setSuggestError(e instanceof Error ? e.message : "Erreur IA");
    } finally {
      setSuggestLoading(false);
    }
  }

  function closeModal() {
    setSelectedPlace(null);
    setSuggestion(null);
    setSuggestError(null);
  }

  function claimPlace() {
    if (!selectedPlace) return;
    // Stash place data so ProAuth can pre-fill the signup form
    sessionStorage.setItem(
      "jeck:claim-place",
      JSON.stringify({
        name: selectedPlace.name,
        category: selectedPlace.category,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        address: selectedPlace.address,
      }),
    );
    closeModal();
    navigate("/pro-auth");
  }

  return (
    <MobileShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <p className="text-xs font-medium text-muted-foreground">{t("map.subtitle")}</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("map.title")}</h1>
      </header>

      <main className="flex-1 px-5">
        <div className="relative h-72 overflow-hidden rounded-3xl border border-border shadow-soft">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Recherche dans un rayon de 30 km…</p>
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={13}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {userPos && (
                <CircleMarker
                  center={userPos}
                  radius={8}
                  pathOptions={{
                    color: "hsl(var(--primary))",
                    fillColor: "hsl(var(--primary))",
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup>Vous êtes ici</Popup>
                </CircleMarker>
              )}
              {places.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lng]}
                  icon={createIcon(categoryEmoji(p.category))}
                  eventHandlers={{ click: () => openSuggestion(p) }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                      <p className="text-xs">{p.distance_km} km</p>
                      <button
                        onClick={() => openSuggestion(p)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary"
                      >
                        <Sparkles className="h-3 w-3" /> Voir l'offre suggérée
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <h2 className="mt-6 font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("map.places")} ({places.length})
        </h2>
        <div className="mt-3 space-y-2 pb-6">
          {places.length === 0 && !loading && !error && (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Aucun lieu trouvé dans un rayon de 30 km.
            </p>
          )}
          {places.map((p) => (
            <button
              key={p.id}
              onClick={() => openSuggestion(p)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-xl">
                {categoryEmoji(p.category)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {p.category}
                </p>
                <p className="truncate text-sm font-bold">{p.name}</p>
                {p.address && (
                  <p className="truncate text-xs text-muted-foreground">{p.address}</p>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {p.distance_km < 1
                  ? `${Math.round(p.distance_km * 1000)} m`
                  : `${p.distance_km} km`}
              </span>
            </button>
          ))}
        </div>
      </main>

      {/* Suggestion Modal */}
      {selectedPlace && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-2xl">
                  {categoryEmoji(selectedPlace.category)}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {selectedPlace.category}
                  </p>
                  <h3 className="truncate font-display text-lg font-extrabold">
                    {selectedPlace.name}
                  </h3>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              {suggestLoading && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">
                    L'IA cuisine une offre contextuelle…
                  </p>
                </div>
              )}

              {suggestError && (
                <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{suggestError}</span>
                </div>
              )}

              {suggestion && (
                <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 to-transparent p-4">
                  <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                    <Sparkles className="h-3 w-3" /> Offre suggérée par l'IA
                  </div>
                  <h4 className="font-display text-base font-extrabold leading-tight">
                    {suggestion.title}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {suggestion.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-card p-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Remise suggérée
                    </span>
                    <span className="font-display text-xl font-extrabold text-primary">
                      -{suggestion.discount}%
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] italic text-muted-foreground">
                    💡 {suggestion.rationale}
                  </p>
                </div>
              )}
            </div>

            {/* Claim section */}
            <div className="mt-5 rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-start gap-3">
                <Store className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-bold">Êtes-vous le gérant ?</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Réclamez votre fiche et publiez vos vraies offres.
                  </p>
                </div>
              </div>
              <button
                onClick={claimPlace}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-accent text-sm font-bold text-white shadow-elegant transition-transform hover:-translate-y-0.5"
              >
                Réclamer cette fiche
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
};

export default MapPage;
