"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  enhancedStatLabel,
  formatSigned,
  formatStat,
  statModifier,
  type StatBonusChip,
} from "@/lib/rules";
import type { StatKey } from "@/lib/types";

export function StatBlock({
  statKey,
  base,
  enhanced,
  bonuses = [],
  neonClass,
  editable = false,
  onBaseChange,
}: {
  statKey: StatKey;
  base: number;
  enhanced: number;
  bonuses?: StatBonusChip[];
  neonClass: string;
  editable?: boolean;
  onBaseChange?: (value: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(base));
  const parsedDraft = parseInt(draft, 10);
  const liveBase = editing && !Number.isNaN(parsedDraft) ? parsedDraft : base;
  const bonusTotal = enhanced - base;
  const liveEnhanced = liveBase + bonusTotal;
  const mod = statModifier(liveEnhanced);
  const plusLabel = enhancedStatLabel(statKey);

  function commit() {
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n) && n >= 0 && n <= 99) onBaseChange?.(n);
    setEditing(false);
  }

  const tooltip = (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute left-1/2 top-full z-[var(--z-drop)] mt-2 w-max min-w-[9rem] max-w-[14rem] -translate-x-1/2",
        "rounded-lg border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.94)] px-2 py-2 shadow-[var(--shadow-glass)]",
        "opacity-0 transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
        "group-hover:opacity-100 group-focus-within:opacity-100"
      )}
    >
      {bonuses.length === 0 ? (
        <span className="block text-center font-ui text-[11px] text-[var(--text-3)]">
          Sin bonificaciones
        </span>
      ) : (
        <span className="flex flex-col items-stretch gap-1">
          {bonuses.map((chip) => (
            <span
              key={`${chip.name}-${chip.value}`}
              className="inline-flex h-6 items-center justify-between gap-2 rounded-full bg-[rgba(0,212,255,0.12)] px-2 text-[10px] text-[var(--cyan-300)]"
            >
              <span className="max-w-[9rem] truncate font-ui">{chip.name}</span>
              <span className="shrink-0 font-stat">{formatSigned(chip.value)}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );

  const inner = (
    <>
      <div className="text-[8px] tracking-[0.16em] text-[var(--text-3)]">{plusLabel}</div>
      <div className="cursor-default font-stat text-xl leading-none">{formatStat(liveEnhanced)}</div>
      <div className="cursor-default text-[10px] text-[var(--text-3)]">{formatSigned(mod)}</div>
      {editing ? (
        <input
          autoFocus
          type="number"
          min={0}
          max={99}
          aria-label={`Stat base ${statKey.toUpperCase()}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="mt-0.5 w-full rounded-[6px] border border-[var(--stroke-glass)] bg-[rgba(16,19,31,0.82)] text-center font-stat text-xs text-[var(--text-2)] outline-none"
        />
      ) : (
        <div className="text-[8px] tracking-[0.12em] text-[var(--text-4)]">
          BASE {formatStat(liveBase)}
        </div>
      )}
      {tooltip}
    </>
  );

  const boxClass = cn(
    "group relative well overflow-visible rounded-[14px] border p-2 text-center",
    neonClass
  );

  if (editable && !editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(base));
          setEditing(true);
        }}
        aria-label={`${plusLabel} ${formatStat(liveEnhanced)}. Editar base.`}
        title={`Clic para editar el stat base de ${statKey.toUpperCase()}`}
        className={cn(boxClass, "cursor-pointer transition-all duration-200 hover:brightness-125")}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      tabIndex={0}
      aria-label={`${plusLabel} ${formatStat(liveEnhanced)}`}
      className={boxClass}
    >
      {inner}
    </div>
  );
}
