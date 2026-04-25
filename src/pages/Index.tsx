import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Sparkles, MapPin } from "lucide-react";
import { MobileShell } from "@/components/jeck/MobileShell";
import { MiaWidget, type Mood } from "@/components/jeck/MiaWidget";
import { QrModal } from "@/components/jeck/QrModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

  const runMia = async () => {
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
    } catch (e) {
      toast({ title: "Mia n'a pas pu générer", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const acceptOffer = async () => {
    if (!result || !user) return;
    setAccepting(true);
    try {
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
        <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {coords ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : "Localisation…"}
        </p>

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
          onClick={runMia}
          disabled={loading || !coords}
          className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary font-display text-sm font-extrabold text-primary-foreground shadow-elegant transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4" />
          {loading ? "Mia analyse votre quartier…" : result ? "Relancer Mia" : "Simuler Mia"}
        </button>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Météo en temps réel + lieux OpenStreetMap proches → offre générée par IA.
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
