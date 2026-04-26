import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Store } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  firstName: z.string().trim().min(1, "Prénom requis").max(40).optional(),
  lastName: z.string().trim().min(1, "Nom requis").max(40).optional(),
});

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && user) {
      navigate(role === "pro" ? "/merchant" : "/", { replace: true });
    }
  }, [user, role, loading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      email,
      password,
      firstName: mode === "signup" ? firstName : undefined,
      lastName: mode === "signup" ? lastName : undefined,
    });
    if (!parsed.success) {
      toast({ title: t("auth.invalid"), description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              first_name: firstName,
              last_name: lastName,
              display_name: `${firstName} ${lastName}`.trim(),
              role: "client",
            },
          },
        });
        if (error) throw error;
        toast({ title: t("auth.welcome") });
      } else {
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
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-[max(env(safe-area-inset-top),2rem)] pb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-elegant">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">JECK</p>
            <h1 className="font-display text-lg font-extrabold tracking-tight">City-Wallet</h1>
          </div>
        </motion.div>

        <h2 className="font-display text-3xl font-extrabold tracking-tight">
          {mode === "signin" ? t("auth.signinTitle") : t("auth.signupTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? t("auth.signinSubtitle") : t("auth.signupSubtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Prénom"
                type="text"
                value={firstName}
                onChange={setFirstName}
                placeholder="Mia"
              />
              <Field
                label="Nom"
                type="text"
                value={lastName}
                onChange={setLastName}
                placeholder="Laurent"
              />
            </div>
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" />
          <Field label={t("auth.password")} type="password" value={password} onChange={setPassword} placeholder="••••••••" />

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-base font-bold text-white shadow-elegant transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {submitting ? "…" : mode === "signin" ? t("auth.signin") : t("auth.signup")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}
        </button>

        <div className="mt-auto pt-8">
          <Link
            to="/pro/auth"
            className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-accent text-white">
              <Store className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-extrabold">{t("auth.proSpace")}</p>
              <p className="text-xs text-muted-foreground">{t("auth.proSpaceDesc")}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
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
        className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export default Auth;
