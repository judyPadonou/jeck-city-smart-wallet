import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Wallet as WalletIcon, Sparkles, Check, Clock } from "lucide-react";
import QRCode from "qrcode";
import { MobileShell } from "@/components/jeck/MobileShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";

interface AcceptedOffer {
  id: string;
  title: string;
  description: string | null;
  discount: number;
  status: "confirmed" | "expired" | string;
  qr_code: string | null;
  accepted_at: string | null;
  merchant: { name: string; category: string } | null;
}

const Wallet = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [items, setItems] = useState<AcceptedOffer[]>([]);
  const [active, setActive] = useState<AcceptedOffer | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setActive(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("generated_offers")
      .select("id, title, description, discount, status, qr_code, accepted_at, merchant_id")
      .eq("accepted_by", user.id)
      .in("status", ["confirmed", "expired"])
      .order("accepted_at", { ascending: false })
      .limit(20);

    const rows = data ?? [];
    const merchantIds = Array.from(new Set(rows.map((r) => r.merchant_id)));
    let merchantsMap = new Map<string, { name: string; category: string }>();
    if (merchantIds.length > 0) {
      const { data: ms } = await supabase
        .from("merchants")
        .select("id, name, category")
        .in("id", merchantIds);
      merchantsMap = new Map((ms ?? []).map((m) => [m.id, { name: m.name, category: m.category }]));
    }

    const mapped: AcceptedOffer[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      discount: Number(r.discount),
      status: r.status,
      qr_code: r.qr_code,
      accepted_at: r.accepted_at,
      merchant: merchantsMap.get(r.merchant_id) ?? null,
    }));

    setItems(mapped);
    const firstActive = mapped.find((m) => m.status === "confirmed") ?? mapped[0] ?? null;
    setActive(firstActive);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: refresh when any of this user's offers change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("wallet-offers")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "generated_offers", filter: `accepted_by=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  return (
    <MobileShell>
      <header className="px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <p className="text-xs font-medium text-muted-foreground">{t("wallet.subtitle")}</p>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("wallet.title")}</h1>
      </header>

      <main className="flex-1 px-5">
        {loading ? (
          <div className="mt-12 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {active && <QrCard item={active} />}

            <h2 className="mt-7 font-display text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("wallet.history")} ({items.length})
            </h2>
            <div className="mt-3 space-y-2">
              {items.map((it) => {
                const isExpired = it.status === "expired";
                return (
                  <button
                    key={it.id}
                    onClick={() => setActive(it)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      active?.id === it.id
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border bg-card hover:border-primary/40"
                    } ${isExpired ? "opacity-70" : ""}`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {it.merchant?.name ?? "Commerce"}
                      </p>
                      <p className="truncate text-sm font-bold">{it.title}</p>
                    </div>
                    {isExpired ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        <Clock className="h-3 w-3" /> Expirée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </MobileShell>
  );
};

function QrCard({ item }: { item: AcceptedOffer }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const isExpired = item.status === "expired";

  useEffect(() => {
    if (!item.qr_code) {
      setQrUrl(null);
      return;
    }
    QRCode.toDataURL(item.qr_code, { width: 320, margin: 1, color: { dark: "#0F172A", light: "#FFFFFF" } })
      .then(setQrUrl)
      .catch(() => setQrUrl(null));
  }, [item.qr_code]);

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={`relative overflow-hidden rounded-3xl p-6 shadow-elegant ${
        isExpired ? "bg-muted text-foreground" : "bg-gradient-primary text-white"
      }`}
    >
      {!isExpired && (
        <>
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -left-10 bottom-10 h-32 w-32 rounded-full bg-accent/30 blur-3xl" />
        </>
      )}

      <div className="relative flex items-center justify-between">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-wider ${isExpired ? "text-muted-foreground" : "text-white/70"}`}>
            {item.merchant?.name ?? "Commerce"}
          </p>
          <h3 className="mt-0.5 font-display text-xl font-extrabold leading-tight">{item.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
          isExpired ? "bg-background text-muted-foreground" : "bg-white/20 text-white"
        }`}>
          -{Math.round(item.discount)}%
        </span>
      </div>

      <div className={`relative mx-auto mt-5 flex max-w-[240px] flex-col items-center rounded-2xl p-4 shadow-2xl ${
        isExpired ? "bg-background/80" : "bg-white"
      }`}>
        {qrUrl ? (
          <img
            src={qrUrl}
            alt="QR code de l'offre"
            className={`h-44 w-44 ${isExpired ? "opacity-30 grayscale" : ""}`}
          />
        ) : (
          <div className="h-44 w-44 animate-pulse rounded-xl bg-secondary" />
        )}
        {isExpired && (
          <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            <Clock className="h-3 w-3" /> Offre expirée
          </p>
        )}
      </div>

      {item.accepted_at && (
        <p className={`relative mt-4 text-center text-[11px] ${isExpired ? "text-muted-foreground" : "text-white/80"}`}>
          Acceptée le {new Date(item.accepted_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
        </p>
      )}
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
