import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { ContextEvaluation } from "@/hooks/useContextWatcher";

interface Props {
  evaluation: ContextEvaluation | null;
  autoEnabled: boolean;
}

/**
 * Panneau "Pourquoi maintenant ?" — explique de façon lisible
 * pourquoi (ou pourquoi pas) Mia se déclenche dans le contexte courant.
 */
export function WhyNowPanel({ evaluation, autoEnabled }: Props) {
  if (!autoEnabled) return null;

  return (
    <AnimatePresence mode="wait">
      {evaluation && (
        <motion.div
          key={evaluation.evaluated_at}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border bg-card/80 p-4 shadow-soft backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Pourquoi maintenant ?
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                evaluation.trigger
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {evaluation.score}/{evaluation.threshold}
            </span>
          </div>

          {evaluation.reasons.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Contexte neutre — Mia attend un signal favorable.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {evaluation.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-xs font-medium text-foreground"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{r.icon}</span>
                    {r.label}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    +{r.weight}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {evaluation.trigger && (
            <p className="mt-3 text-[11px] font-semibold text-primary">
              ✨ Conditions favorables détectées — Mia génère une offre.
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
