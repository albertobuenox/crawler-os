"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  onClose: () => void;
}

export function Modal({
  open,
  title,
  subtitle,
  eyebrow,
  action,
  children,
  wide = false,
  onClose,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[rgba(5,6,13,0.72)] p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-modal-title"
            initial={{ scale: 0.94, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className={cn(
              "glass max-h-[min(88vh,760px)] w-full overflow-y-auto border-[var(--stroke-cyan)] p-6 shadow-[var(--glow-cyan)]",
              wide ? "max-w-2xl" : "max-w-lg"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {eyebrow && (
                  <p className="font-display text-[10px] tracking-[var(--ls-system)] text-[var(--text-cyan)]">
                    {eyebrow}
                  </p>
                )}
                <div className="mt-1 flex items-center gap-3">
                  {action}
                  <div className="min-w-0">
                    <h3
                      id="app-modal-title"
                      className="font-display text-lg tracking-wide text-[var(--text-1)]"
                    >
                      {title}
                    </h3>
                    {subtitle && (
                      <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-3)]">{subtitle}</p>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-[var(--text-3)] transition-colors hover:bg-white/10 hover:text-[var(--text-1)]"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
