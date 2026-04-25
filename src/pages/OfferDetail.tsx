import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Clock, Tag, Sparkles, Check, ArrowRight } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { addToWallet, getOfferById } from "@/lib/jeck-data";
import { moodThemes } from "@/lib/mood-theme";
import { useI18n } from "@/lib/i18n";

const OfferDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const offer = getOfferById(id);
  const [accepted, setAccepted] = useState(false);
  const { t } = useI18n();

  if (!offer) {
    return (
      <MobileShell hideTabs>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-muted-foreground">{t("offer.notFound")}</p>
          <Link to="/" className="mt-4 text-sm font-semibold text-primary hover:underline">
            {t("offer.backHome")}
          </Link>
        </div>
      </MobileShell>
    );
  }

  const theme = moodThemes[offer.mood];

  const handleAccept = () => {
    addToWallet(offer);
    setAccepted(true);
    setTimeout(() => navigate("/wallet"), 900);
  };

  return (
    <MobileShell hideTabs>
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`relative overflow-hidden ${theme.gradient} px-5 pb-8 pt-[max(env(safe-area-inset-top),1rem)]`}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-white/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />

        <div className="relative flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-colors hover:bg-white/30"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            {t("offer.aiTag")}
          </span>
        </div>

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mt-6 flex justify-center"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/95 text-6xl shadow-2xl">
            {offer.emoji}
          </div>
        </motion.div>

        <div className="relative mt-5 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{offer.merchant}</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight text-balance">{offer.title}</h1>
          <div className="mt-3 inline-flex items-baseline gap-2 rounded-2xl bg-white/15 px-4 py-2 backdrop-blur-md">
            <span className="font-display text-3xl font-extrabold">{offer.price.toFixed(2)}€</span>
            <span className="text-sm text-white/70 line-through">{offer.originalPrice.toFixed(2)}€</span>
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-extrabold text-accent">
              -{offer.discount}%
            </span>
          </div>
        </div>
      </motion.section>

      <main className="flex-1 px-5 py-6 pb-40">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-2"
        >
          <Stat icon={<MapPin className="h-4 w-4" />} label={t("offer.distance")} value={`${offer.distance}m`} />
          <Stat icon={<Clock className="h-4 w-4" />} label={t("offer.valid")} value={offer.validUntil.split(" ").pop() ?? offer.validUntil} />
          <Stat icon={<Tag className="h-4 w-4" />} label={t("offer.type")} value={offer.category} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
            {t("offer.why")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{offer.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {offer.contextTags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${theme.badge}`}
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-soft"
        >
          <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
            {t("offer.how")}
          </h2>
          <ol className="mt-3 space-y-2.5 text-sm">
            <Step n={1}>{t("offer.step1")}</Step>
            <Step n={2}>{t("offer.step2")}</Step>
            <Step n={3}>{t("offer.step3")}</Step>
          </ol>
        </motion.div>
      </main>

      {/* Sticky CTA — high z-index, strong contrast, safe-area aware */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4 shadow-[0_-12px_30px_-12px_hsl(var(--foreground)/0.18)] backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <motion.button
            onClick={handleAccept}
            disabled={accepted}
            whileTap={{ scale: 0.97 }}
            aria-label={accepted ? t("offer.added") : t("offer.acceptCta")}
            className={`relative flex h-16 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl font-display text-lg font-extrabold tracking-tight ring-2 ring-offset-2 ring-offset-background transition-all ${
              accepted
                ? "bg-success text-white ring-success/40 shadow-elegant"
                : "bg-gradient-accent text-accent-foreground ring-accent/40 shadow-accent hover:brightness-105 active:brightness-95"
            }`}
          >
            {accepted ? (
              <>
                <Check className="h-6 w-6" />
                {t("offer.added")}
              </>
            ) : (
              <>
                <span>{t("offer.acceptCta")} · -{offer.discount}%</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </MobileShell>
  );
};

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-primary">
        {icon}
      </div>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {n}
      </span>
      <span className="pt-0.5 text-foreground">{children}</span>
    </li>
  );
}

export default OfferDetail;
