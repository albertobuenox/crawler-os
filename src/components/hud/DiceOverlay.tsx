"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/copy";

interface DiceOverlayProps {
  open: boolean;
  label: string;
  dc?: number | null;
  floorNumber?: number;
  onRoll: () => void;
  onClose: () => void;
  result?: { total: number; raw: number[]; success?: boolean | null } | null;
  rolling?: boolean;
  canRoll?: boolean;
}

export function DiceOverlay({
  open,
  label,
  dc,
  floorNumber,
  onRoll,
  onClose,
  result,
  rolling,
  canRoll = true,
}: DiceOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-[rgba(5,6,13,0.65)] p-4"
        >
          <motion.div
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            className="glass w-full max-w-sm p-6 text-center"
          >
            <p className="font-display text-xs tracking-[var(--ls-system)] text-[var(--cyan-400)]">
              {BRAND}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--text-1)]">{label}</h3>
            <div className="mt-4 flex justify-center gap-4 text-xs text-[var(--text-3)]">
              {floorNumber !== undefined && <span>FN {floorNumber}</span>}
              {dc !== undefined && dc !== null && <span>DC {dc}</span>}
            </div>

            <motion.div
              animate={rolling ? { rotate: [0, 360, 720] } : {}}
              transition={{ duration: 0.8 }}
              className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-2xl well font-stat text-4xl text-[var(--cyan-400)] shadow-[var(--glow-cyan)]"
            >
              {result ? result.total : "d20"}
            </motion.div>

            {result && (
              <p className="mt-3 font-mono-system text-sm text-[var(--text-2)]">
                Tiradas: [{result.raw.join(", ")}]
                {result.success !== null && result.success !== undefined && (
                  <span className={result.success ? " text-[var(--ok)]" : " text-[var(--danger)]"}>
                    {" "}
                    — {result.success ? "ÉXITO" : "FALLO"}
                  </span>
                )}
              </p>
            )}

            <div className="mt-6 flex gap-2">
              {!result && canRoll && (
                <Button variant="energy" className="flex-1" loading={rolling} onClick={onRoll}>
                  Tirar
                </Button>
              )}
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                {result ? "Cerrar" : "Cancelar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
