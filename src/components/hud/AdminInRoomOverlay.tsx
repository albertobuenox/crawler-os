"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ADMIN_IN_ROOM_BANNER, ADMIN_IN_ROOM_HEADER, BORANT_ICON_SRC } from "@/lib/copy";

export function AdminInRoomOverlay({
  active,
  className = "fixed inset-0",
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          role="status"
          aria-live="assertive"
          aria-label={ADMIN_IN_ROOM_BANNER}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          className={`${className} z-[72] flex items-center justify-center bg-[rgba(5,6,13,0.9)] backdrop-blur-[8px]`}
        >
          <motion.div
            initial={{ scale: 0.92, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="glass flex max-w-[min(22rem,calc(100vw-2rem))] flex-col items-center gap-4 rounded-[22px] border border-[var(--stroke-cyan)] px-7 py-6 text-center shadow-[var(--glow-cyan)]"
          >
            <span className="h-20 w-20 overflow-hidden rounded-[16px] border-2 border-[var(--stroke-cyan-hot)] bg-[rgba(8,10,18,0.9)] shadow-[var(--glow-cyan)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BORANT_ICON_SRC} alt="" className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="font-display text-[10px] tracking-[var(--ls-system)] text-[var(--cyan-400)]">
                {ADMIN_IN_ROOM_HEADER}
              </p>
              <p className="mt-2 font-display text-base tracking-wide text-[var(--text-1)]">
                {ADMIN_IN_ROOM_BANNER}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
