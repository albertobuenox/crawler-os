"use client";

import { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE = {
  md: "max-h-[min(88vh,760px)] max-w-lg",
  lg: "max-h-[min(90vh,840px)] max-w-2xl",
  xl: "max-h-[min(94vh,960px)] max-w-5xl",
} as const;

interface ModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  size?: keyof typeof SIZE;
  stacked?: boolean;
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
  size,
  stacked = false,
  onClose,
}: ModalProps) {
  const box = SIZE[size ?? (wide ? "lg" : "md")];
  const titleId = useId();
  const pointerDownOnBackdrop = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (stacked) e.stopImmediatePropagation();
      onClose();
    }
    window.addEventListener("keydown", onKey, stacked);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, stacked);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, stacked]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "fixed inset-0 flex items-center justify-center bg-[rgba(5,6,13,0.72)] p-4 backdrop-blur-sm",
            stacked ? "z-[54]" : "z-[var(--z-modal)]",
          )}
          onPointerDown={(e) => {
            pointerDownOnBackdrop.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (pointerDownOnBackdrop.current && e.target === e.currentTarget) onClose();
            pointerDownOnBackdrop.current = false;
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ scale: 0.94, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className={cn(
              "glass w-full overflow-y-auto border-[var(--stroke-cyan)] p-6 shadow-[var(--glow-cyan)]",
              box
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
                      id={titleId}
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
