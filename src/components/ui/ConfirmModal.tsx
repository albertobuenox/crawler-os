"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/copy";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Borrar",
  cancelLabel = "Cancelar",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[rgba(5,6,13,0.72)] p-4 backdrop-blur-sm"
          onClick={() => {
            if (!loading) onCancel();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="glass w-full max-w-md border-[var(--stroke-danger)] p-6 shadow-[var(--glow-danger)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-xs tracking-[var(--ls-system)] text-[var(--danger)]">
              {BRAND} — PURGE
            </p>
            <h3
              id="confirm-modal-title"
              className="mt-3 font-display text-lg tracking-wide text-[var(--text-1)]"
            >
              {title}
            </h3>
            {body && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{body}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
                {cancelLabel}
              </Button>
              <Button type="button" variant="danger" loading={loading} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
