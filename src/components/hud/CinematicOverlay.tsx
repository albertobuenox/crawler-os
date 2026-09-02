"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import type { NotificationType, Rarity } from "@/lib/types";
import { RARITY_COLORS } from "@/lib/types";

interface CinematicOverlayProps {
  open: boolean;
  type: "reward" | "penalty" | "loot_box" | "achievement";
  title: string;
  body?: string;
  itemName?: string;
  rarity?: Rarity;
  onClose: () => void;
}

const typeConfig = {
  reward: { header: "REWARD", cta: "Reclamar", variant: "energy" as const },
  penalty: { header: "PENALTY", cta: "Aceptar", variant: "danger" as const },
  loot_box: { header: "LOOT BOX", cta: "Abrir", variant: "energy" as const },
  achievement: { header: "ACHIEVEMENT", cta: "Reclamar", variant: "energy" as const },
};

export function CinematicOverlay({
  open,
  type,
  title,
  body,
  itemName,
  rarity = "legendary",
  onClose,
}: CinematicOverlayProps) {
  const config = typeConfig[type];
  const isPenalty = type === "penalty";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--z-cinematic)] flex items-center justify-center bg-[rgba(5,6,13,0.72)] p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          {!isPenalty && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -120 }}
                  transition={{ duration: 0.6, delay: i * 0.04 }}
                  className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full bg-[var(--orange-400)]"
                  style={{
                    marginLeft: `${(i - 6) * 24}px`,
                  }}
                />
              ))}
            </motion.div>
          )}

          <motion.div
            initial={{ scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className={`glass max-w-md w-full p-8 text-center ${
              isPenalty ? "border-[var(--stroke-danger)]" : "border-[var(--stroke-reward)]"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className={`font-display text-xs tracking-[var(--ls-system)] ${
                isPenalty ? "text-[var(--danger)]" : "text-[var(--gold-400)]"
              }`}
            >
              {config.header}
            </p>
            <h2 className="mt-3 font-display text-xl text-[var(--text-1)]">{title}</h2>
            {body && <p className="mt-2 text-sm text-[var(--text-2)]">{body}</p>}
            {itemName && (
              <div
                className="mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-xl border-2 text-2xl"
                style={{
                  borderColor: RARITY_COLORS[rarity],
                  boxShadow: `0 0 24px ${RARITY_COLORS[rarity]}66`,
                }}
              >
                📦
              </div>
            )}
            {itemName && (
              <p className="mt-3 font-semibold" style={{ color: RARITY_COLORS[rarity] }}>
                {itemName}
              </p>
            )}
            <Button
              variant={config.variant}
              className="mt-8 w-full"
              onClick={onClose}
            >
              {config.cta}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
