"use client";

import type { EventLogEntry } from "@/lib/types";
import { isChatEvent } from "@/lib/chat";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/copy";

const eventColors: Record<string, string> = {
  REWARD: "text-[var(--orange-400)]",
  PENALTY: "text-[var(--danger)]",
  SYSTEM: "text-[var(--cyan-400)]",
  COMBAT: "text-[var(--hp)]",
  ROLL: "text-[var(--text-cyan)]",
  ACHIEVEMENT: "text-[var(--gold-400)]",
  REST: "text-[var(--ok)]",
};

interface EventLogListProps {
  entries: EventLogEntry[];
  compact?: boolean;
  className?: string;
}

export function EventLogList({ entries, compact, className }: EventLogListProps) {
  const visible = entries.filter((e) => !isChatEvent(e));
  if (visible.length === 0) {
    return (
      <p className="font-mono-system text-sm text-[var(--text-3)]">
        No hay eventos. El dungeon observa.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-1 font-mono-system text-xs", className)}>
      {visible.map((e) => (
        <li
          key={e.id}
          className="rounded px-2 py-1.5 hover:bg-[rgba(0,212,255,0.06)]"
        >
          <span className="text-[var(--text-4)]">
            {new Date(e.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>{" "}
          <span className={cn("font-semibold", eventColors[e.event_type] ?? "")}>
            [{e.event_type === "SYSTEM" ? BRAND : e.event_type}]
          </span>{" "}
          <span className="text-[var(--text-2)]">{e.message}</span>
        </li>
      ))}
    </ul>
  );
}

interface NotificationBellProps {
  count: number;
}

export function NotificationBadge({ count }: NotificationBellProps) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--orange-500)] px-1 text-[10px] font-bold text-white shadow-[var(--glow-orange)]">
      {count > 9 ? "9+" : count}
    </span>
  );
}
