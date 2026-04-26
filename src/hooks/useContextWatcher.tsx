import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ContextReason { icon: string; label: string; weight: number }
export interface ContextEvaluation {
  trigger: boolean;
  score: number;
  threshold: number;
  reasons: ContextReason[];
  context: {
    weather: { description: string | null; temperature: number | null; city: string | null; condition: string | null };
    hour: number;
    day: string;
    merchant: { id: string; name: string; category: string; distance_m: number } | null;
    flow: { transaction_count: number; avg_basket: number } | null;
    is_off_peak: boolean;
  };
  evaluated_at: string;
}

interface Options {
  coords: { lat: number; lng: number } | null;
  enabled: boolean;
  intervalMs?: number;     // fréquence du polling (défaut 30s)
  cooldownMs?: number;     // cooldown entre 2 déclenchements auto (défaut 5min)
  threshold?: number;      // seuil de score pour déclencher (défaut 60)
  onTrigger: (evaluation: ContextEvaluation) => void | Promise<void>;
}

/**
 * Polle l'edge function `evaluate-context` à intervalle régulier.
 * Quand `evaluation.trigger === true` et que le cooldown est passé,
 * appelle `onTrigger` (qui doit lancer simulate-mia côté Index).
 */
export function useContextWatcher({
  coords,
  enabled,
  intervalMs = 30_000,
  cooldownMs = 5 * 60_000,
  threshold = 60,
  onTrigger,
}: Options) {
  const [evaluation, setEvaluation] = useState<ContextEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const lastFiredRef = useRef<number>(0);
  const onTriggerRef = useRef(onTrigger);
  onTriggerRef.current = onTrigger;

  const evaluate = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-context", {
        body: { lat: coords.lat, lng: coords.lng, threshold },
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? "evaluate-context failed");
      const ev = data as ContextEvaluation;
      setEvaluation(ev);

      const now = Date.now();
      if (ev.trigger && now - lastFiredRef.current > cooldownMs) {
        lastFiredRef.current = now;
        await onTriggerRef.current(ev);
      }
    } catch (e) {
      console.warn("[useContextWatcher]", e);
    } finally {
      setLoading(false);
    }
  }, [coords, threshold, cooldownMs]);

  useEffect(() => {
    if (!enabled || !coords) return;
    // Premier check immédiat puis polling
    evaluate();
    const id = window.setInterval(evaluate, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, coords, intervalMs, evaluate]);

  return { evaluation, loading, evaluateNow: evaluate };
}
