import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";
import { Offer } from "@/lib/jeck-data";
import { moodThemes } from "@/lib/mood-theme";

interface Props {
  offer: Offer;
  index?: number;
}

export function OfferCard({ offer, index = 0 }: Props) {
  const theme = moodThemes[offer.mood];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
    >
      <Link
        to={`/offer/${offer.id}`}
        className="group flex items-stretch gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-elegant"
      >
        <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-xl ${theme.accentSoft} text-4xl`}>
          {offer.emoji}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {offer.merchant}
              </p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${theme.badge}`}>
                -{offer.discount}%
              </span>
            </div>
            <h3 className="mt-0.5 line-clamp-2 font-display text-sm font-bold text-foreground leading-snug">
              {offer.title}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {offer.distance}m
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {offer.validUntil}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
