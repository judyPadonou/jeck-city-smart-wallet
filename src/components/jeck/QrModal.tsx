import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface Props {
  open: boolean;
  qrPayload: string | null;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function QrModal({ open, qrPayload, title, subtitle, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!qrPayload) { setDataUrl(null); return; }
    QRCode.toDataURL(qrPayload, { width: 320, margin: 1, color: { dark: "#0F172A", light: "#FFFFFF" } })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [qrPayload]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-elegant"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
                  <Check className="h-3 w-3" /> Offre confirmée
                </span>
                <h3 className="mt-3 font-display text-lg font-extrabold leading-tight">{title}</h3>
                {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex justify-center rounded-2xl bg-background p-4 ring-1 ring-border">
              {dataUrl ? (
                <img src={dataUrl} alt="QR code de l'offre" className="h-64 w-64" />
              ) : (
                <div className="h-64 w-64 animate-pulse rounded-xl bg-secondary" />
              )}
            </div>

            <p className="mt-4 text-center text-xs text-muted-foreground">
              Présentez ce QR code au commerçant pour valider votre offre.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
