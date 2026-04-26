import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2 } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

interface MerchantRow {
  id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
}

// Custom emoji-style marker
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
  if (c.includes("shop") || c.includes("boutique") || c.includes("store")) return "🛍️";
  return "📍";
};

const MapPage = () => {
  const { t } = useI18n();
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id,name,category,lat,lng");
      if (!error && data) {
        setMerchants(data.filter((m) => m.lat != null && m.lng != null) as MerchantRow[]);
      }
      setLoading(false);
    })();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (userPos) return userPos;
    if (merchants.length > 0) {
      const avgLat = merchants.reduce((s, m) => s + (m.lat ?? 0), 0) / merchants.length;
      const avgLng = merchants.reduce((s, m) => s + (m.lng ?? 0), 0) / merchants.length;
      return [avgLat, avgLng];
    }
    return [48.8566, 2.3522]; // Paris fallback
  }, [userPos, merchants]);

  return (
    <MobileShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <p className="text-xs font-medium text-muted-foreground">{t("map.subtitle")}</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("map.title")}</h1>
      </header>

      <main className="flex-1 px-5">
        <div className="relative h-72 overflow-hidden rounded-3xl border border-border shadow-soft">
          {loading ? (
            <div className="flex h-full items-center justify-center bg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={14}
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
              {merchants.map((m) => (
                <Marker
                  key={m.id}
                  position={[m.lat!, m.lng!]}
                  icon={createIcon(categoryEmoji(m.category))}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="text-sm font-bold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.category}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <h2 className="mt-6 font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("map.places")} ({merchants.length})
        </h2>
        <div className="mt-3 space-y-2 pb-6">
          {merchants.length === 0 && !loading && (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Aucun commerce enregistré pour le moment.
            </p>
          )}
          {merchants.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-xl">
                {categoryEmoji(m.category)}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.category}
                </p>
                <p className="text-sm font-bold">{m.name}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
      </main>
    </MobileShell>
  );
};

export default MapPage;
