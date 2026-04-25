import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  LogOut, Sparkles, Target, TrendingUp, ShoppingBag, Clock, Eye, Check, Zap,
} from "lucide-react";
import { getMerchantStats } from "@/lib/jeck-data";
import { useAuth } from "@/hooks/useAuth";

const goals = [
  { id: "rush", label: "Remplir les heures creuses", icon: Clock },
  { id: "stock", label: "Écouler les stocks", icon: ShoppingBag },
  { id: "acquire", label: "Acquérir nouveaux clients", icon: Target },
  { id: "loyalty", label: "Fidéliser", icon: Zap },
];

const Merchant = () => {
  const stats = getMerchantStats();
  const [discount, setDiscount] = useState(20);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["rush", "stock"]);
  const [autoMode, setAutoMode] = useState(true);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate("/pro/auth", { replace: true });
  };

  const toggleGoal = (id: string) =>
    setSelectedGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));

  const acceptanceRate = Math.round((stats.accepted / stats.generated) * 100);

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
              <h1 className="font-display text-lg font-extrabold leading-tight">Dashboard</h1>
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
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi icon={<Sparkles className="h-4 w-4" />} label="Offres générées" value={stats.generated.toLocaleString("fr-FR")} delta="+12%" tone="primary" />
          <Kpi icon={<Eye className="h-4 w-4" />} label="Vues" value="920" delta="+8%" tone="rain" />
          <Kpi icon={<Check className="h-4 w-4" />} label="Acceptées" value={stats.accepted.toLocaleString("fr-FR")} delta={`${acceptanceRate}%`} tone="accent" />
          <Kpi icon={<TrendingUp className="h-4 w-4" />} label="CA généré" value={`${stats.revenue.toLocaleString("fr-FR")}€`} delta="+24%" tone="success" />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Funnel chart */}
          <Card className="lg:col-span-2">
            <CardHeader title="Flux de transactions Payone" subtitle="7 derniers jours" />
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
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v}€`, "Transactions"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#fillPrimary)"
                  />
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
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

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

          {/* Discount slider */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">Remise maximum autorisée</label>
              <span className="font-display text-2xl font-extrabold text-accent">-{discount}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="mt-3 h-2 w-full appearance-none rounded-full bg-secondary accent-accent"
              style={{
                background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${(discount / 30) * 100}%, hsl(var(--secondary)) ${(discount / 30) * 100}%, hsl(var(--secondary)) 100%)`,
              }}
            />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>0%</span>
              <span>15%</span>
              <span>30%</span>
            </div>
          </div>

          {/* Goals */}
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
                      active
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border bg-card hover:border-primary/40"
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

          {/* Save */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary font-display text-sm font-extrabold text-primary-foreground shadow-elegant sm:w-auto sm:px-8"
          >
            <Sparkles className="h-4 w-4" />
            Mettre à jour l'IA
          </motion.button>
        </Card>
      </main>
    </div>
  );
};

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
