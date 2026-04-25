import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { Wallet as WalletIcon, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { getWallet, WalletItem } from "@/lib/jeck-data";
import { moodThemes } from "@/lib/mood-theme";
import { useI18n } from "@/lib/i18n";

const Wallet = () => {
  const [items, setItems] = useState<WalletItem[]>([]);
  const [active, setActive] = useState<WalletItem | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const w = getWallet();
    setItems(w);
    setActive(w[0] ?? null);
  }, []);

  return (
    <MobileShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <p className="text-xs font-medium text-muted-foreground">{t("wallet.subtitle")}</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("wallet.title")}</h1>
      </header>

      <main className="flex-1 px-5">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* QR Card */}
            {active && <QrCard item={active} />}

            {/* History */}
            <h2 className="mt-7 font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("wallet.history")} ({items.length})
            </h2>
            <div className="mt-3 space-y-2">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setActive(it)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                    active?.id === it.id
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${moodThemes[it.offer.mood].accentSoft}`}
                  >
                    {it.offer.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {it.offer.merchant}
                    </p>
                    <p className="truncate text-sm font-bold">{it.offer.title}</p>
                  </div>
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                    {t("wallet.active")}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </MobileShell>
  );
};

function QrCard({ item }: { item: WalletItem }) {
  const theme = moodThemes[item.offer.mood];
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 shadow-elegant"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-10 h-32 w-32 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative flex items-center justify-between text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">
            {item.offer.merchant}
          </p>
          <h3 className="mt-0.5 font-display text-xl font-extrabold leading-tight">{item.offer.title}</h3>
        </div>
        <span className="text-3xl">{item.offer.emoji}</span>
      </div>

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
        className="relative mx-auto mt-5 flex max-w-[220px] flex-col items-center rounded-2xl bg-white p-4 shadow-2xl"
      >
        <QRCodeSVG
          value={item.code}
          size={180}
          level="H"
          bgColor="#ffffff"
          fgColor="hsl(222 65% 18%)"
        />
        <p className="mt-3 font-mono text-[11px] font-bold tracking-widest text-primary">{item.code}</p>
      </motion.div>

      <div className="relative mt-5 flex items-center justify-between text-white">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/70">{t("wallet.savings")}</p>
          <p className="font-display text-lg font-extrabold">
            {(item.offer.originalPrice - item.offer.price).toFixed(2)}€
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${theme.badge}`}>-{item.offer.discount}%</span>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/70">{t("common.validUntil")}</p>
          <p className="font-display text-lg font-extrabold">{item.offer.validUntil}</p>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 rounded-3xl border-2 border-dashed border-border bg-card p-8 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <WalletIcon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-display text-lg font-extrabold">{t("wallet.empty.title")}</h2>
      <p className="mx-auto mt-1 max-w-[260px] text-sm text-muted-foreground">
        {t("wallet.empty.desc")}
      </p>
      <Link
        to="/"
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-accent px-5 py-2.5 text-sm font-bold text-white shadow-accent"
      >
        <Sparkles className="h-4 w-4" />
        {t("wallet.empty.cta")}
      </Link>
    </motion.div>
  );
}

export default Wallet;
