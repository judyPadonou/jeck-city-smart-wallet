import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Sparkles, MapPin, Zap } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { MiaWidget, type Mood } from "@/components/jeck/MiaWidget";
import { QrModal } from "@/components/jeck/QrModal";
import { WhyNowPanel } from "@/components/jeck/WhyNowPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContextWatcher } from "@/hooks/useContextWatcher";
import { toast } from "@/hooks/use-toast";

interface SimResult {
  offer: {
    id: string; title: string; description: string | null;
    discount: number; status: string; merchant_id: string;
  };
  merchant: { name: string; category: string; distance_m: number };
  weather: { description: string | null; temperature: number | null; city: string | null } | null;
  mood: Mood;
}

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);

  // Pre-fetch geolocation once on mount (silent fallback to Paris)
  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords({ lat: 48.8566, lng: 2.3522 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords({ lat: 48.8566, lng: 2.3522 }),
      { timeout: 6000 },
    );
  }, []);

  const runMia = useCallback(async (auto = false) => {
    if (!coords) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-mia", {
        body: { lat: coords.lat, lng: coords.lng },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "Erreur Mia");
      setResult(data as SimResult);
      if (auto) {
        toast({ title: "Mia a détecté un contexte favorable", description: "Une offre vient d'être générée pour vous." });
      }
    } catch (e) {
      toast({ title: "Mia n'a pas pu générer", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [coords]);

  // Watcher contextuel — déclenche Mia automatiquement quand le score dépasse le seuil
  const { evaluation } = useContextWatcher({
    coords,
    enabled: autoEnabled,
    intervalMs: 30_000,
    cooldownMs: 5 * 60_000,
    threshold: 60,
    onTrigger: () => runMia(true),
  });

  const acceptOffer = async () => {
    if (!result || !user) return;
    setAccepting(true);
    try {
      // Expire any previously confirmed offer of this user (only one active QR at a time)
      await supabase
        .from("generated_offers")
        .update({ status: "expired" })
        .eq("accepted_by", user.id)
        .eq("status", "confirmed");

      const payload = JSON.stringify({
        offer_id: result.offer.id,
        merchant_id: result.offer.merchant_id,
        user_id: user.id,
        ts: Date.now(),
        sig: crypto.randomUUID(),
      });
      const { data: updated, error } = await supabase
        .from("generated_offers")
        .update({
          status: "confirmed",
          accepted_by: user.id,
          accepted_at: new Date().toISOString(),
          qr_code: payload,
        })
        .eq("id", result.offer.id)
        .eq("status", "active")
        .select()
        .single();
      if (error) throw error;
      setResult({ ...result, offer: { ...result.offer, status: "confirmed" } });
      setQrPayload(updated.qr_code);
      setQrOpen(true);
    } catch (e) {
      toast({ title: "Impossible d'accepter", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <MobileShell>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background/80 px-5 pb-3 pt-[max(env(safe-area-inset-top),1rem)] backdrop-blur-xl">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Bonjour</p>
          <h1 className="font-display text-lg font-extrabold tracking-tight">
            <span className="text-primary">JECK</span> City Wallet
          </h1>
        </div>
        <button onClick={() => navigate("/profile")} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow-soft">
          <Bell className="h-4 w-4" />
        </button>
      </header>

      <main className="flex-1 px-5 pt-2">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {coords ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "Localisation…"}
          </p>
          <button
            onClick={() => setAutoEnabled((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
              autoEnabled
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Zap className="h-3 w-3" />
            Mia auto {autoEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mb-4">
          <WhyNowPanel evaluation={evaluation} autoEnabled={autoEnabled} />
        </div>

        <MiaWidget
          loading={loading}
          offer={result?.offer ?? null}
          mood={result?.mood ?? "idle"}
          weather={result?.weather ?? null}
          merchant={result?.merchant ?? null}
          onAccept={acceptOffer}
          accepting={accepting}
        />

        <button
          onClick={() => runMia(false)}
          disabled={loading || !coords}
          className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary font-display text-sm font-extrabold text-primary-foreground shadow-elegant transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Mia analyse votre quartier…" : result ? "Relancer Mia" : "Forcer Mia (manuel)"}
        </button>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Mia surveille en continu météo, heure, jour et affluence du commerce le plus proche.
        </p>
      </main>

      <QrModal
        open={qrOpen}
        qrPayload={qrPayload}
        title={result?.offer.title ?? ""}
        subtitle={result?.merchant ? `${result.merchant.name} · -${Math.round(Number(result.offer.discount))}%` : undefined}
        onClose={() => setQrOpen(false)}
      />
    </MobileShell>
  );
};

export default Index;
