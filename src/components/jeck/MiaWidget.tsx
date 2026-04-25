import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Cloud, Sun, Moon, Sparkles, MapPin, Check, Loader2 } from "lucide-react";

export type Mood = "rain" | "sun" | "night" | "rush" | "idle";

interface Offer {
  id: string;
  title: string;
  description: string | null;
  discount: number;
  status: string;
}
interface MerchantInfo { name: string; category: string; distance_m: number }
interface WeatherInfo { description: string | null; temperature: number | null; city: string | null }

interface Props {
  loading: boolean;
  offer: Offer | null;
  mood: Mood;
  weather?: WeatherInfo | null;
  merchant?: MerchantInfo | null;
  onAccept?: () => void | Promise<void>;
  accepting?: boolean;
}

const moodGradient: Record<Mood, string> = {
  rain: "var(--gradient-rain)",
  sun: "var(--gradient-sun)",
  night: "var(--gradient-night)",
  rush: "var(--gradient-accent)",
  idle: "var(--gradient-primary)",
};

const moodIcon: Record<Mood, React.ReactNode> = {
  rain: <Cloud className="h-4 w-4" />,
  sun: <Sun className="h-4 w-4" />,
  night: <Moon className="h-4 w-4" />,
  rush: <Sparkles className="h-4 w-4" />,
  idle: <Sparkles className="h-4 w-4" />,
};

const moodLabel: Record<Mood, string> = {
  rain: "Pluie",
  sun: "Soleil",
  night: "Soirée",
  rush: "Heure de pointe",
  idle: "Repos",
};

export function MiaWidget({ loading, offer, mood, weather, merchant, onAccept, accepting }: Props) {
  const [shimmerKey, setShimmerKey] = useState(0);
  useEffect(() => {
    if (loading) setShimmerKey((k) => k + 1);
  }, [loading]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="relative overflow-hidden rounded-3xl p-6 text-white shadow-elegant"
      style={{ backgroundImage: moodGradient[mood] }}
    >
      {/* Animated noise / shimmer */}
      <motion.div
        key={shimmerKey}
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0.2 }}
        animate={{ opacity: [0.15, 0.35, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.12), transparent 45%)",
        }}
      />

      <div className="relative z-10 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
          {moodIcon[mood]} {moodLabel[mood]}
        </span>
        {weather?.city && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold opacity-90">
            <MapPin className="h-3 w-3" /> {weather.city}
            {typeof weather.temperature === "number" ? ` · ${Math.round(weather.temperature)}°C` : ""}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mt-6"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="font-display text-lg font-extrabold tracking-tight">
                Analyse de votre quartier…
              </p>
            </div>
            <div className="mt-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                  className="h-3 rounded-full bg-white/30"
                  style={{ width: `${90 - i * 18}%` }}
                />
              ))}
            </div>
          </motion.div>
        ) : offer ? (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 mt-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {merchant && (
                  <p className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                    {merchant.name} · {merchant.category} · {merchant.distance_m} m
                  </p>
                )}
                <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-tight text-balance">
                  {offer.title}
                </h2>
                {offer.description && (
                  <p className="mt-2 text-sm leading-snug opacity-95">{offer.description}</p>
                )}
              </div>
              <div className="shrink-0 rounded-2xl bg-white/15 px-3 py-2 text-center backdrop-blur">
                <p className="font-display text-3xl font-extrabold leading-none">-{Math.round(Number(offer.discount))}%</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-90">offre</p>
              </div>
            </div>

            {onAccept && offer.status === "active" && (
              <button
                onClick={onAccept}
                disabled={accepting}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-extrabold text-foreground shadow-elegant transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {accepting ? "Confirmation…" : "Accepter l'offre"}
              </button>
            )}
            {offer.status === "confirmed" && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
                <Check className="h-3.5 w-3.5" /> Offre confirmée
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mt-6"
          >
            <p className="font-display text-lg font-extrabold tracking-tight">
              Aucune offre pour l'instant
            </p>
            <p className="mt-1 text-sm opacity-90">
              Lance Mia pour générer une offre adaptée à ton quartier.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
