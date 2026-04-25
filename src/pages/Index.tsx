import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { ContextBadges } from "@/components/jeck/ContextBadges";
import { MagicOfferCard } from "@/components/jeck/MagicOfferCard";
import { OfferCard } from "@/components/jeck/OfferCard";
import { detectContext, mockOffers, pickMagicOffer, CityContext } from "@/lib/jeck-data";
import { useI18n } from "@/lib/i18n";

const Index = () => {
  const [context, setContext] = useState<CityContext>(() => detectContext());
  const { t } = useI18n();

  // Simulate context refresh — change every 8s for the demo of "generative UI".
  useEffect(() => {
    const moods: CityContext["mood"][] = ["rain", "sun", "night", "rush"];
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % moods.length;
      const base = detectContext();
      setContext({ ...base, mood: moods[i] });
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const magicOffer = useMemo(() => pickMagicOffer(context), [context]);
  const otherOffers = useMemo(
    () => mockOffers.filter((o) => o.id !== magicOffer.id),
    [magicOffer.id],
  );

  return (
    <MobileShell>
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background/80 px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-xl">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t("home.greeting")}</p>
          <h1 className="font-display text-lg font-extrabold tracking-tight">
            <span className="text-primary">JECK</span> City-Wallet
          </h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft">
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-5 pt-2">
        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={t("home.searchPlaceholder")}
            className="h-12 w-full rounded-2xl border border-border bg-card pl-11 pr-4 text-sm font-medium placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        {/* Context badges */}
        <ContextBadges context={context} />

        {/* Magic offer */}
        <div className="mt-4">
          <MagicOfferCard offer={magicOffer} context={context} />
        </div>

        {/* Section title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-7 flex items-end justify-between"
        >
          <div>
            <h2 className="font-display text-lg font-extrabold tracking-tight">{t("home.nearby")}</h2>
            <p className="text-xs text-muted-foreground">{t("home.aiSelected")} · {otherOffers.length} {t("home.offers")}</p>
          </div>
          <button className="text-xs font-semibold text-primary hover:underline">{t("common.seeAll")}</button>
        </motion.div>

        {/* Feed */}
        <div className="mt-3 space-y-2.5">
          {otherOffers.map((offer, i) => (
            <OfferCard key={offer.id} offer={offer} index={i} />
          ))}
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground">
          {t("home.generated")}
        </p>
      </main>
    </MobileShell>
  );
};

export default Index;
