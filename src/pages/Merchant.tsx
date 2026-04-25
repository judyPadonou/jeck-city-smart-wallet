import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  LogOut, Sparkles, Target, TrendingUp, ShoppingBag, Clock, Eye, Check, Zap,
  Plus, Trash2, Pause, Play, Store,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMerchantData, type OfferStatus } from "@/hooks/useMerchantData";
import { Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const goals = [
  { id: "rush", label: "Remplir les heures creuses", icon: Clock },
  { id: "stock", label: "Écouler les stocks", icon: ShoppingBag },
  { id: "acquire", label: "Acquérir nouveaux clients", icon: Target },
  { id: "loyalty", label: "Fidéliser", icon: Zap },
];

const Merchant = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const {
    merchant, offers, stats, loading,
    createMerchant, updateRules, createOffer, updateOfferStatus, deleteOffer, generateAIOffer,
  } = useMerchantData();
  const [generatingAI, setGeneratingAI] = useState(false);

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    try {
      const getCoords = () =>
        new Promise<{ lat?: number; lng?: number }>((resolve) => {
          if (merchant?.lat && merchant?.lng) return resolve({ lat: merchant.lat, lng: merchant.lng });
          if (!navigator.geolocation) return resolve({});
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({}),
            { timeout: 5000 },
          );
        });
      const coords = await getCoords();
      const res = await generateAIOffer({ ...coords, status: "draft" });
      toast({
        title: "Offre IA générée ✨",
        description: res.rationale ?? "Brouillon ajouté à tes offres.",
      });
    } catch (e) {
      toast({ title: "Erreur IA", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  const initialRules = (merchant?.rules ?? {}) as { discount?: number; goals?: string[]; auto?: boolean };
  const [discount, setDiscount] = useState<number>(initialRules.discount ?? 20);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(initialRules.goals ?? ["rush", "stock"]);
  const [autoMode, setAutoMode] = useState<boolean>(initialRules.auto ?? true);
  const [savingRules, setSavingRules] = useState(false);

  // Sync local rule state when merchant loads
  useEffect(() => {
    if (!merchant) return;
    const r = (merchant.rules ?? {}) as { discount?: number; goals?: string[]; auto?: boolean };
    if (typeof r.discount === "number") setDiscount(r.discount);
    if (Array.isArray(r.goals)) setSelectedGoals(r.goals);
    if (typeof r.auto === "boolean") setAutoMode(r.auto);
  }, [merchant]);

  // Onboarding state for first-time pros (no merchant yet)
  const [bizName, setBizName] = useState("");
  const [bizCategory, setBizCategory] = useState("Café");
  const [creating, setCreating] = useState(false);

  // New offer form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDiscount, setNewDiscount] = useState(15);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/pro/auth", { replace: true });
  };

  const toggleGoal = (id: string) =>
    setSelectedGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await updateRules({ discount, goals: selectedGoals, auto: autoMode });
      toast({ title: "Règles mises à jour", description: "L'IA va utiliser ces nouveaux paramètres." });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSavingRules(false);
    }
  };

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) return;
    setCreating(true);
    try {
      await createMerchant({ name: bizName.trim(), category: bizCategory });
      toast({ title: "Commerce créé 🎉", description: "Vous pouvez créer vos premières offres." });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmittingOffer(true);
    try {
      await createOffer({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        discount: newDiscount,
        status: "active",
      });
      setNewTitle("");
      setNewDesc("");
      setNewDiscount(15);
      toast({ title: "Offre publiée ✨", description: "Elle est visible par les clients." });
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmittingOffer(false);
    }
  };

  const acceptanceRate = stats && stats.generated > 0 ? Math.round((stats.accepted / stats.generated) * 100) : 0;

  const hasMerchant = !!merchant;

  return (
    <div className="min-h-screen bg-secondary/50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-accent text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">JECK Pro</p>
              <h1 className="font-display text-lg font-extrabold leading-tight">
                {merchant?.name ?? "Dashboard"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              IA active
            </span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-6">
        {loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        )}

        {!loading && !hasMerchant && (
          <Card>
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Store className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-display text-lg font-extrabold">Créez votre commerce</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pour commencer à publier des offres, enregistrez votre commerce.
                </p>
                <form onSubmit={handleCreateMerchant} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nom du commerce"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                    required
                    className="h-11 rounded-xl border border-border bg-background px-4 text-sm"
                  />
                  <select
                    value={bizCategory}
                    onChange={(e) => setBizCategory(e.target.value)}
                    className="h-11 rounded-xl border border-border bg-background px-4 text-sm"
                  >
                    {["Café", "Restaurant", "Boulangerie", "Bar", "Glacier", "Autre"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={creating}
                    className="sm:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-primary text-sm font-extrabold text-primary-foreground shadow-elegant disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {creating ? "Création…" : "Créer mon commerce"}
                  </button>
                </form>
              </div>
            </div>
          </Card>
        )}

        {!loading && hasMerchant && stats && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi icon={<Sparkles className="h-4 w-4" />} label="Offres générées" value={stats.generated.toLocaleString("fr-FR")} delta={`${offers.length}`} tone="primary" />
              <Kpi icon={<Eye className="h-4 w-4" />} label="Actives" value={offers.filter((o) => o.status === "active").length.toString()} delta="—" tone="rain" />
              <Kpi icon={<Check className="h-4 w-4" />} label="Acceptation" value={`${acceptanceRate}%`} delta={`${stats.accepted}`} tone="accent" />
              <Kpi icon={<TrendingUp className="h-4 w-4" />} label="CA généré" value={`${stats.revenue.toLocaleString("fr-FR")}€`} delta="7j" tone="success" />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {/* Transactions chart */}
              <Card className="lg:col-span-2">
                <CardHeader title="Flux de transactions" subtitle="7 derniers jours" />
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.transactions} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }}
                        formatter={(v: number) => [`${v}€`, "Transactions"]}
                      />
                      <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#fillPrimary)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card>
                <CardHeader title="Funnel de conversion" subtitle="Cette semaine" />
                <div className="mt-2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.funnel} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Offers manager */}
            <Card className="mt-4">
              <CardHeader title="Mes offres" subtitle="Créez et gérez vos offres en temps réel" />

              <form onSubmit={handleCreateOffer} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  type="text"
                  placeholder="Titre (ex: Cappuccino + cookie offert)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="h-11 rounded-xl border border-border bg-background px-4 text-sm"
                />
                <input
                  type="text"
                  placeholder="Description (optionnel)"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="h-11 rounded-xl border border-border bg-background px-4 text-sm"
                />
                <input
                  type="number"
                  min={0}
                  max={90}
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(Number(e.target.value))}
                  className="h-11 w-24 rounded-xl border border-border bg-background px-4 text-sm"
                  aria-label="Remise (%)"
                />
                <button
                  type="submit"
                  disabled={submittingOffer}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-accent px-4 text-sm font-extrabold text-white shadow-elegant disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" />
                  Publier
                </button>
              </form>

              <div className="mt-4 divide-y divide-border">
                {offers.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Aucune offre pour l'instant. Créez la première ci-dessus.
                  </p>
                )}
                {offers.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold">{o.title}</p>
                        <StatusBadge status={o.status} />
                      </div>
                      {o.description && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{o.description}</p>
                      )}
                    </div>
                    <span className="font-display text-base font-extrabold text-accent">-{Number(o.discount)}%</span>
                    <button
                      onClick={() => updateOfferStatus(o.id, o.status === "active" ? "paused" : "active")}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary"
                      aria-label={o.status === "active" ? "Mettre en pause" : "Activer"}
                    >
                      {o.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => deleteOffer(o.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-destructive hover:bg-destructive/10"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* AI Rules */}
            <Card className="mt-4">
              <div className="flex items-start justify-between gap-4">
                <CardHeader
                  title="Règles de l'IA"
                  subtitle="Définissez les paramètres dans lesquels l'IA générera vos offres."
                />
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Auto</span>
                  <span className="relative inline-flex h-6 w-11">
                    <input
                      type="checkbox"
                      checked={autoMode}
                      onChange={(e) => setAutoMode(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="absolute inset-0 rounded-full bg-secondary transition-colors peer-checked:bg-success" />
                    <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                  </span>
                </label>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Remise maximum autorisée</label>
                  <span className="font-display text-2xl font-extrabold text-accent">-{discount}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="mt-3 h-2 w-full appearance-none rounded-full bg-secondary accent-accent"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${(discount / 50) * 100}%, hsl(var(--secondary)) ${(discount / 50) * 100}%, hsl(var(--secondary)) 100%)`,
                  }}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-foreground">Objectifs prioritaires</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {goals.map((g) => {
                    const Icon = g.icon;
                    const active = selectedGoals.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        onClick={() => toggleGoal(g.id)}
                        className={`flex flex-col items-start gap-2 rounded-2xl border p-3 text-left transition-all ${
                          active ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-bold leading-tight">{g.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveRules}
                disabled={savingRules}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary font-display text-sm font-extrabold text-primary-foreground shadow-elegant disabled:opacity-60 sm:w-auto sm:px-8"
              >
                <Sparkles className="h-4 w-4" />
                {savingRules ? "Enregistrement…" : "Mettre à jour l'IA"}
              </motion.button>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

function StatusBadge({ status }: { status: OfferStatus }) {
  const map: Record<OfferStatus, { label: string; cls: string }> = {
    active: { label: "Active", cls: "bg-success-soft text-success" },
    draft: { label: "Brouillon", cls: "bg-secondary text-muted-foreground" },
    paused: { label: "En pause", cls: "bg-rain-soft text-rain" },
    expired: { label: "Expirée", cls: "bg-destructive/10 text-destructive" },
  };
  const m = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}>{m.label}</span>;
}

function Kpi({
  icon, label, value, delta, tone,
}: {
  icon: React.ReactNode; label: string; value: string; delta: string; tone: "primary" | "accent" | "rain" | "success";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent-soft text-accent",
    rain: "bg-rain-soft text-rain",
    success: "bg-success-soft text-success",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-soft"
    >
      <div className="flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[tone]}`}>{icon}</span>
        <span className="text-[11px] font-bold text-success">{delta}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-extrabold leading-none">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-border bg-card p-5 shadow-soft ${className}`}>{children}</div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="font-display text-base font-extrabold tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export default Merchant;
