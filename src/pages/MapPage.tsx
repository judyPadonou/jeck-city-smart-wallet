import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { mockOffers } from "@/lib/jeck-data";
import { moodThemes } from "@/lib/mood-theme";
import { Link } from "react-router-dom";

const MapPage = () => {
  return (
    <MobileShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <p className="text-xs font-medium text-muted-foreground">Autour de moi</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Carte des offres</h1>
      </header>

      <main className="flex-1 px-5">
        {/* Mock map surface */}
        <div className="relative h-72 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rain-soft via-secondary to-sun-soft shadow-soft">
          {/* Grid lines */}
          <svg className="absolute inset-0 h-full w-full opacity-40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Center pin (you) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="absolute inset-0 -m-3 animate-ping rounded-full bg-primary/30" />
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-elegant">
              <Navigation className="h-3 w-3" />
            </div>
          </div>

          {/* Offer pins */}
          {mockOffers.slice(0, 5).map((o, i) => {
            const angle = (i / 5) * Math.PI * 2;
            const r = 35 + (i % 2) * 10;
            const x = 50 + Math.cos(angle) * r;
            const y = 50 + Math.sin(angle) * r;
            return (
              <Link
                to={`/offer/${o.id}`}
                key={o.id}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 * i, type: "spring", stiffness: 200 }}
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${moodThemes[o.mood].gradient} text-xl shadow-elegant ring-4 ring-white/80`}
                >
                  {o.emoji}
                </motion.div>
              </Link>
            );
          })}
        </div>

        <h2 className="mt-6 font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
          Lieux ({mockOffers.length})
        </h2>
        <div className="mt-3 space-y-2">
          {mockOffers.map((o) => (
            <Link
              key={o.id}
              to={`/offer/${o.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${moodThemes[o.mood].accentSoft} text-xl`}>
                {o.emoji}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{o.merchant}</p>
                <p className="text-sm font-bold">{o.title}</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {o.distance}m
              </span>
            </Link>
          ))}
        </div>
      </main>
    </MobileShell>
  );
};

export default MapPage;
