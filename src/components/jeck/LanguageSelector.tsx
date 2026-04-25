import { Languages, Check } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lang, useI18n } from "@/lib/i18n";

const options: { code: Lang; flag: string; labelKey: string }[] = [
  { code: "fr", flag: "🇫🇷", labelKey: "lang.fr" },
  { code: "en", flag: "🇬🇧", labelKey: "lang.en" },
  { code: "de", flag: "🇩🇪", labelKey: "lang.de" },
];

export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.code === lang)!;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-primary">
          <Languages className="h-4 w-4" />
        </span>
        <span className="flex-1 text-sm font-semibold">{t("lang.label")}</span>
        <span className="text-xs text-muted-foreground">
          {current.flag} {t(current.labelKey)}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            {options.map((opt) => {
              const active = opt.code === lang;
              return (
                <li key={opt.code}>
                  <button
                    onClick={() => {
                      setLang(opt.code);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                      active ? "bg-primary/5 text-primary" : "hover:bg-secondary"
                    }`}
                  >
                    <span className="text-base">{opt.flag}</span>
                    <span className="flex-1 font-medium">{t(opt.labelKey)}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              );
            })}
            <li className="px-4 py-2 text-[11px] text-muted-foreground">{t("profile.languageHint")}</li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
