import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CityContext, Offer } from "@/lib/jeck-data";
import { moodThemes } from "@/lib/mood-theme";
import { useI18n } from "@/lib/i18n";

interface Props {
  offer: Offer;
  context: CityContext;
}

export function MagicOfferCard({ offer, context }: Props) {
  const theme = moodThemes[context.mood];
  const { t } = useI18n();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${offer.id}-${context.mood}`}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className={`relative overflow-hidden rounded-3xl ${theme.gradient} p-6 shadow-elegant`}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
              <Sparkles className="h-3 w-3" />
              Offre magique
            </span>
            <span className="text-2xl">{theme.emoji}</span>
          </div>

          <div className="mt-5 flex items-start gap-4">
            <motion.div
              animate={{ rotate: [0, -6, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-3xl shadow-lg"
            >
              {offer.emoji}
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                {offer.merchant} · {offer.distance}m
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold leading-tight text-white text-balance">
                {offer.title}
              </h2>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-extrabold text-white">-{offer.discount}%</span>
                <span className="text-sm font-medium text-white/75 line-through">
                  {offer.originalPrice.toFixed(2)}€
                </span>
              </div>
              <p className="mt-1 text-xs text-white/80">Valable {offer.validUntil}</p>
            </div>
            <Link
              to={`/offer/${offer.id}`}
              className="group inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              Voir
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
