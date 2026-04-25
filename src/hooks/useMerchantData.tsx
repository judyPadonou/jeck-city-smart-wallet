import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type OfferStatus = "draft" | "active" | "paused" | "expired";

export interface Merchant {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  lat: number | null;
  lng: number | null;
  rules: Record<string, unknown>;
}

export interface GeneratedOffer {
  id: string;
  merchant_id: string;
  title: string;
  description: string | null;
  discount: number;
  status: OfferStatus;
  context_used: Record<string, unknown>;
  created_at: string;
}

export interface Transaction {
  id: string;
  merchant_id: string;
  amount: number;
  timestamp: string;
}

export interface MerchantStats {
  generated: number;
  accepted: number;
  revenue: number;
  conversionRate: number;
  transactions: { day: string; value: number }[];
  funnel: { name: string; value: number }[];
}

const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function buildStats(offers: GeneratedOffer[], txs: Transaction[]): MerchantStats {
  const generated = offers.length;
  const accepted = offers.filter((o) => o.status === "active").length;
  const revenue = txs.reduce((sum, t) => sum + Number(t.amount), 0);
  const conversionRate = generated > 0 ? Math.round((accepted / generated) * 100) : 0;

  // Last 7 days transactions
  const now = new Date();
  const buckets = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    buckets.set(DAY_LABELS[d.getDay()], 0);
  }
  txs.forEach((t) => {
    const d = new Date(t.timestamp);
    const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 7) {
      const label = DAY_LABELS[d.getDay()];
      buckets.set(label, (buckets.get(label) ?? 0) + Number(t.amount));
    }
  });
  const transactions = Array.from(buckets.entries()).map(([day, value]) => ({ day, value }));

  const funnel = [
    { name: "Générées", value: generated },
    { name: "Vues", value: Math.round(generated * 0.72) },
    { name: "Acceptées", value: accepted },
    { name: "Utilisées", value: txs.length },
  ];

  return { generated, accepted, revenue, conversionRate, transactions, funnel };
}

export function useMerchantData() {
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [offers, setOffers] = useState<GeneratedOffer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<MerchantStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch merchants owned by this user (take first or create later)
    const { data: merchants } = await supabase
      .from("merchants")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1);

    const m = (merchants?.[0] ?? null) as Merchant | null;
    setMerchant(m);

    if (!m) {
      setOffers([]);
      setTransactions([]);
      setStats(buildStats([], []));
      setLoading(false);
      return;
    }

    const [{ data: offerRows }, { data: txRows }] = await Promise.all([
      supabase
        .from("generated_offers")
        .select("*")
        .eq("merchant_id", m.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("*")
        .eq("merchant_id", m.id)
        .order("timestamp", { ascending: false }),
    ]);

    const o = (offerRows ?? []) as GeneratedOffer[];
    const t = (txRows ?? []) as Transaction[];
    setOffers(o);
    setTransactions(t);
    setStats(buildStats(o, t));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createMerchant = useCallback(
    async (input: { name: string; category: string; lat?: number; lng?: number }) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("merchants")
        .insert({
          owner_id: user.id,
          name: input.name,
          category: input.category,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          rules: {},
        })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      return data as Merchant;
    },
    [user, refresh],
  );

  const updateRules = useCallback(
    async (rules: Record<string, unknown>) => {
      if (!merchant) return;
      const { error } = await supabase
        .from("merchants")
        .update({ rules })
        .eq("id", merchant.id);
      if (error) throw error;
      setMerchant({ ...merchant, rules });
    },
    [merchant],
  );

  const createOffer = useCallback(
    async (input: { title: string; description?: string; discount: number; status?: OfferStatus }) => {
      if (!merchant) throw new Error("Aucun commerce");
      const { error } = await supabase.from("generated_offers").insert({
        merchant_id: merchant.id,
        title: input.title,
        description: input.description ?? null,
        discount: input.discount,
        status: input.status ?? "active",
        context_used: {},
      });
      if (error) throw error;
      await refresh();
    },
    [merchant, refresh],
  );

  const updateOfferStatus = useCallback(
    async (id: string, status: OfferStatus) => {
      const { error } = await supabase
        .from("generated_offers")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const deleteOffer = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("generated_offers").delete().eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  return {
    merchant,
    offers,
    transactions,
    stats,
    loading,
    refresh,
    createMerchant,
    updateRules,
    createOffer,
    updateOfferStatus,
    deleteOffer,
  };
}
