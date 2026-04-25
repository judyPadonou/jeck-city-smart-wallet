import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, MapPin, Store, ArrowLeft } from "lucide-react";

type Merchant = {
  id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
};

const TEST_PRESETS = [
  { name: "Café Mia", category: "Café", lat: 48.8566, lng: 2.3522 },
  { name: "Bistrot du Coin", category: "Restaurant", lat: 48.8606, lng: 2.3376 },
  { name: "Boulangerie Lumière", category: "Boulangerie", lat: 48.8530, lng: 2.3499 },
];

export default function MerchantAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Café");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("merchants")
      .select("id, name, category, lat, lng")
      .order("created_at", { ascending: false });
    setMerchants((data ?? []) as Merchant[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const addMerchant = async (m: { name: string; category: string; lat: number; lng: number }) => {
    if (!user) return;
    const { error } = await supabase.from("merchants").insert({
      owner_id: user.id, name: m.name, category: m.category, lat: m.lat, lng: m.lng, rules: {},
    });
    if (error) throw error;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lat || !lng) return;
    setBusy(true);
    try {
      await addMerchant({ name: name.trim(), category, lat: Number(lat), lng: Number(lng) });
      setName(""); setLat(""); setLng("");
      toast({ title: "Commerce ajouté ✅" });
      await refresh();
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const seedTests = async () => {
    setBusy(true);
    try {
      for (const m of TEST_PRESETS) await addMerchant(m);
      toast({ title: "3 commerces tests ajoutés ✨" });
      await refresh();
    } catch (err) {
      toast({ title: "Erreur", description: (err as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("merchants").delete().eq("id", id);
    if (error) return toast({ title: "Erreur", description: error.message, variant: "destructive" });
    await refresh();
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3">
          <button onClick={() => navigate(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">JECK Pro</p>
            <h1 className="font-display text-lg font-extrabold leading-tight">Commerces tests</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-6 space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-extrabold">Ajout rapide</h2>
              <p className="text-sm text-muted-foreground">Crée 3 commerces de démo en un clic (Paris).</p>
            </div>
            <button
              onClick={seedTests}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-extrabold text-primary-foreground shadow-elegant disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Ajouter les 3 tests
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-base font-extrabold">Ajouter manuellement</h2>
          <form onSubmit={handleAdd} className="mt-3 grid grid-cols-1 sm:grid-cols-6 gap-3">
            <input className="h-11 sm:col-span-3 rounded-xl border border-border bg-background px-4 text-sm" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} required />
            <select className="h-11 sm:col-span-3 rounded-xl border border-border bg-background px-4 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              {["Café", "Restaurant", "Boulangerie", "Bar", "Glacier", "Autre"].map((c) => <option key={c}>{c}</option>)}
            </select>
            <input className="h-11 sm:col-span-3 rounded-xl border border-border bg-background px-4 text-sm" placeholder="Latitude (ex: 48.8566)" value={lat} onChange={(e) => setLat(e.target.value)} required />
            <input className="h-11 sm:col-span-3 rounded-xl border border-border bg-background px-4 text-sm" placeholder="Longitude (ex: 2.3522)" value={lng} onChange={(e) => setLng(e.target.value)} required />
            <button type="submit" disabled={busy} className="sm:col-span-6 h-11 rounded-xl bg-gradient-accent text-sm font-extrabold text-white shadow-elegant disabled:opacity-60">
              Ajouter le commerce
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <h2 className="font-display text-base font-extrabold">Commerces enregistrés</h2>
          {loading ? (
            <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
          ) : merchants.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aucun commerce pour l'instant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {merchants.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Store className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold">{m.name} <span className="text-xs text-muted-foreground">· {m.category}</span></p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {m.lat?.toFixed(4) ?? "?"}, {m.lng?.toFixed(4) ?? "?"}
                    </p>
                  </div>
                  <button onClick={() => remove(m.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
