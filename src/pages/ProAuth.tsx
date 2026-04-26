import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, ArrowRight, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  businessName: z.string().trim().min(1).max(120).optional(),
  businessCategory: z.string().trim().min(1).max(60).optional(),
});

const ProAuth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [claimedPlace, setClaimedPlace] = useState<{
    name: string;
    category: string;
    lat?: number;
    lng?: number;
    address?: string | null;
  } | null>(null);
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { t } = useI18n();

  // Pre-fill from a "claim place" flow coming from the Map
  useEffect(() => {
    const raw = sessionStorage.getItem("jeck:claim-place");
    if (raw) {
      try {
        const p = JSON.parse(raw);
        setClaimedPlace(p);
        setBusinessName(p.name ?? "");
        setBusinessCategory(p.category ?? "");
        setMode("signup");
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (loading || !user) return;

    // Wait until the role has actually been resolved (not the transient null
    // between sign-in and the user_roles fetch). Without this guard we would
    // sign the user out the moment they sign in, before their pro role loads.
    if (role === null) return;

    // If the user arrived here with a "claim place" pending AND is confirmed
    // to be a client (not a pro), sign them out so they can create / log into
    // a Pro account. We also check the auth user_metadata as a safety net for
    // freshly-created pro accounts whose user_roles row may not exist yet.
    const pendingClaim =
      sessionStorage.getItem("jeck:claim-place") ||
      localStorage.getItem("jeck:claim-place-pending");
    const metaRole = (user.user_metadata as any)?.role;

    if (pendingClaim && role === "client" && metaRole !== "pro") {
      supabase.auth.signOut().then(() => {
        toast({
          title: "Connexion Pro requise",
          description:
            "Vous étiez connecté en tant que client. Connectez-vous ou créez un compte Pro pour réclamer cette fiche.",
        });
      });
      return;
    }

    navigate(role === "pro" || metaRole === "pro" ? "/merchant" : "/", { replace: true });
  }, [user, role, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      email,
      password,
      businessName: mode === "signup" ? businessName : undefined,
      businessCategory: mode === "signup" ? businessCategory : undefined,
    });
    if (!parsed.success) {
      toast({ title: t("auth.invalid"), description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        // Persist claim BEFORE signup so the merchant page can use it after email confirmation
        if (claimedPlace) {
          localStorage.setItem("jeck:claim-place-pending", JSON.stringify(claimedPlace));
          sessionStorage.removeItem("jeck:claim-place");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/merchant`,
            data: {
              role: "pro",
              business_name: businessName,
              business_category: businessCategory,
              display_name: businessName,
            },
          },
        });
        if (error) {
          // If the user already exists, switch to sign-in mode automatically
          const msg = (error.message || "").toLowerCase();
          const code = (error as any).code;
          if (
            code === "user_already_exists" ||
            msg.includes("already registered") ||
            msg.includes("already exists") ||
            msg.includes("user already")
          ) {
            setMode("signin");
            toast({
              title: "Compte déjà existant",
              description:
                "Un compte Pro existe déjà avec cet email. Connectez-vous avec votre mot de passe pour finaliser la réclamation.",
            });
            return;
          }
          throw error;
        }
        toast({
          title: claimedPlace ? "Vérifiez votre email 📧" : t("auth.proWelcome"),
          description: claimedPlace
            ? `Un lien de confirmation a été envoyé à ${email}. Cliquez dessus pour activer votre compte et finaliser la réclamation de « ${claimedPlace.name} ».`
            : `Un lien de confirmation a été envoyé à ${email}.`,
        });
      } else {
        // Make sure the claim is persisted before sign-in too (in case the user
        // arrived from the Map but already has a Pro account).
        if (claimedPlace) {
          localStorage.setItem("jeck:claim-place-pending", JSON.stringify(claimedPlace));
          sessionStorage.removeItem("jeck:claim-place");
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),2rem)] pb-8">
        <Link to="/auth" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent text-white shadow-elegant">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">JECK Pro</p>
            <h1 className="font-display text-lg font-extrabold tracking-tight">{t("auth.proDashboard")}</h1>
          </div>
        </motion.div>

        <h2 className="font-display text-3xl font-extrabold tracking-tight">
          {mode === "signin" ? t("auth.proSigninTitle") : t("auth.proSignupTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? t("auth.proSigninSubtitle") : t("auth.proSignupSubtitle")}
        </p>

        {claimedPlace && mode === "signup" && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-accent/40 bg-accent/5 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">
              ✨ Réclamation de fiche
            </p>
            <p className="mt-1 text-sm font-bold">{claimedPlace.name}</p>
            {claimedPlace.address && (
              <p className="text-xs text-muted-foreground">{claimedPlace.address}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Créez votre compte pour activer vos vraies offres sur ce lieu.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <>
              <Field label={t("auth.businessName")} type="text" value={businessName} onChange={setBusinessName} placeholder="Café Lumière" />
              <Field label={t("auth.businessCategory")} type="text" value={businessCategory} onChange={setBusinessCategory} placeholder="Café, Restaurant…" />
            </>
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="pro@exemple.com" />
          <Field label={t("auth.password")} type="password" value={password} onChange={setPassword} placeholder="••••••••" />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-accent text-base font-bold text-white shadow-elegant transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitting ? "…" : mode === "signin" ? t("auth.signin") : t("auth.proSignup")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? t("auth.proNoAccount") : t("auth.haveAccount")}
        </button>
      </div>
    </div>
  );
};

function Field({
  label, type, value, onChange, placeholder,
}: { label: string; type: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}

export default ProAuth;
