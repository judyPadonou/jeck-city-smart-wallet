import { Link } from "react-router-dom";
import { Settings, ChevronRight, Bell, Shield, Heart, LogOut, Store, Sparkles } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { LanguageSelector } from "@/components/jeck/LanguageSelector";
import { getWallet } from "@/lib/jeck-data";
import { useI18n } from "@/lib/i18n";

const Profile = () => {
  const items = getWallet();
  const totalSaved = items.reduce((s, i) => s + (i.offer.originalPrice - i.offer.price), 0);
  const { t } = useI18n();

  return (
    <MobileShell>
      <header className="flex items-center justify-between px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)]">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{t("profile.subtitle")}</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">{t("profile.title")}</h1>
        </div>
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card shadow-soft">
          <Settings className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-1 px-5">
        {/* Identity card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 text-white shadow-elegant">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 font-display text-2xl font-extrabold backdrop-blur-md">
              M
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">Mia Laurent</h2>
              <p className="text-xs text-white/80">{t("profile.member")}</p>
            </div>
          </div>
          <div className="relative mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-wider text-white/70">{t("profile.saved")}</p>
              <p className="font-display text-2xl font-extrabold">{totalSaved.toFixed(2)}€</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-md">
              <p className="text-[10px] uppercase tracking-wider text-white/70">{t("profile.usedOffers")}</p>
              <p className="font-display text-2xl font-extrabold">{items.length}</p>
            </div>
          </div>
        </div>

        {/* Promo merchant */}
        <Link
          to="/merchant"
          className="mt-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 transition-transform hover:-translate-y-0.5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-accent text-white">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-extrabold text-foreground">{t("profile.merchantQ")}</p>
            <p className="text-xs text-muted-foreground">{t("profile.merchantDesc")}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </Link>

        {/* Settings */}
        <h3 className="mt-6 px-1 font-display text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
          {t("profile.preferences")}
        </h3>

        {/* Language selector */}
        <div className="mt-2">
          <LanguageSelector />
        </div>

        <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          <Row icon={<Sparkles className="h-4 w-4" />} label={t("profile.aiPersonalization")} hint={t("profile.activated")} />
          <Row icon={<Bell className="h-4 w-4" />} label={t("profile.notifications")} hint={t("profile.geoNotif")} />
          <Row icon={<Heart className="h-4 w-4" />} label={t("profile.favorites")} hint={t("profile.favoritesValue")} />
          <Row icon={<Shield className="h-4 w-4" />} label={t("profile.privacy")} />
        </div>

        <button className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 text-sm font-bold text-destructive shadow-soft">
          <LogOut className="h-4 w-4" />
          {t("profile.logout")}
        </button>
      </main>
    </MobileShell>
  );
};

function Row({ icon, label, hint }: { icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

export default Profile;
