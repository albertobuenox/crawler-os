"use client";

import {
  ADMIN_IN_ROOM_ACTIVATE,
  ADMIN_IN_ROOM_DEACTIVATE,
  BORANT_ICON_SRC,
} from "@/lib/copy";
import { cn } from "@/lib/utils";

export function AdminInRoomButton({
  active,
  pending,
  onToggle,
}: {
  active: boolean;
  pending?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={active}
      className={cn(
        "ml-auto flex h-10 items-center gap-2 rounded-[12px] border px-2 pr-3 font-display text-[11px] tracking-wide",
        "transition-[border-color,box-shadow,color] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
        "disabled:cursor-not-allowed disabled:opacity-55",
        active
          ? "border-[var(--stroke-danger)] text-[var(--danger)] shadow-[var(--glow-danger)]"
          : "border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--stroke-cyan)] hover:text-[var(--text-1)]"
      )}
    >
      <span className="h-7 w-7 overflow-hidden rounded-[8px] bg-[rgba(8,10,18,0.85)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BORANT_ICON_SRC} alt="" className="h-full w-full object-cover" />
      </span>
      <span>{active ? ADMIN_IN_ROOM_DEACTIVATE : ADMIN_IN_ROOM_ACTIVATE}</span>
    </button>
  );
}
