import { Plus, Star } from "lucide-react";
import type { LootBoxRarity, Rarity } from "@/lib/types";
import { RARITY_COLORS } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/copy";
import { LOOT_BOX_RARITY_COLORS, LOOT_BOX_RARITY_LABEL, lootHalo } from "@/lib/loot";
import { cn } from "@/lib/utils";

interface InventorySlotProps {
  name?: string;
  rarity?: Rarity;
  lootRarity?: LootBoxRarity | null;
  unique?: boolean;
  quantity?: number;
  equipped?: boolean;
  hotlist?: boolean;
  selected?: boolean;
  empty?: boolean;
  highlighted?: boolean;
  iconUrl?: string | null;
  detail?: string;
  bonuses?: string[];
  sourceLabel?: string | null;
  hideRarity?: boolean;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLButtonElement>) => void;
  onAdd?: () => void;
}

export function InventorySlot({
  name,
  rarity = "common",
  lootRarity,
  unique,
  quantity,
  equipped,
  hotlist,
  selected,
  empty,
  highlighted,
  iconUrl,
  detail,
  bonuses,
  sourceLabel,
  hideRarity,
  size = "md",
  showTooltip,
  draggable,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onAdd,
}: InventorySlotProps) {
  const tooltip = showTooltip && !empty && name && !highlighted;
  const halo = lootRarity ? LOOT_BOX_RARITY_COLORS[lootRarity] : null;
  const accent = halo ?? RARITY_COLORS[rarity];
  const droppable = Boolean(onDrop);

  return (
    <button
      type="button"
      onClick={onAdd ?? onClick}
      onDoubleClick={onDoubleClick}
      disabled={empty && !droppable && !onAdd}
      draggable={Boolean(draggable && !empty)}
      onDragStart={draggable && !empty ? onDragStart : undefined}
      onDragEnd={draggable && !empty ? onDragEnd : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
      aria-label={onAdd ? "Crear objeto" : empty ? "Hueco vacío" : name}
      className={cn(
        "group relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border p-1 transition-[border-color,box-shadow,filter,transform] duration-[var(--t-ui)]",
        size === "lg" && "min-h-[72px] sm:min-h-[80px]",
        size === "sm" && "min-h-[48px] rounded-lg p-0.5",
        empty && !onAdd
          ? "cursor-default border-dashed border-[rgba(255,255,255,0.12)] bg-transparent disabled:opacity-100"
          : empty && onAdd
            ? "cursor-pointer border-dashed border-[rgba(0,212,255,0.28)] bg-transparent text-[var(--cyan-400)] hover:border-[var(--stroke-cyan)] hover:bg-[rgba(0,212,255,0.06)]"
            : "well cursor-pointer hover:brightness-110",
        draggable && !empty && "cursor-grab active:cursor-grabbing",
        selected && "ring-2 ring-[var(--cyan-400)] shadow-[var(--glow-cyan)]",
        highlighted && "scale-105 ring-2 ring-[var(--cyan-400)] shadow-[var(--glow-cyan)]"
      )}
      style={
        !empty || highlighted
          ? {
              borderColor: highlighted ? "var(--cyan-400)" : `${accent}88`,
              boxShadow: highlighted
                ? "var(--glow-cyan)"
                : selected
                  ? undefined
                  : lootRarity
                    ? lootHalo(lootRarity)
                    : `0 0 10px ${accent}44`,
            }
          : undefined
      }
    >
      {empty && onAdd ? (
        <span className="flex flex-col items-center justify-center">
          <Plus size={size === "sm" ? 14 : 18} strokeWidth={1.75} />
          <span className="mt-0.5 text-[8px] uppercase tracking-[0.14em]">Crear</span>
        </span>
      ) : null}
      {!empty && (
        <>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={iconUrl}
              alt=""
              className={cn(
                "mb-0.5 object-contain",
                size === "sm" ? "h-6 w-6" : "h-10 w-10 sm:h-12 sm:w-12"
              )}
            />
          ) : null}
          <span
            className={cn(
              "line-clamp-2 text-center font-medium text-[var(--text-2)]",
              size === "sm" ? "text-[8px]" : "text-[10px]"
            )}
          >
            {name}
          </span>
          {quantity !== undefined && quantity > 1 && (
            <span className="absolute bottom-1 right-1 rounded-full bg-[var(--void-950)] px-1.5 text-[10px] text-[var(--text-1)]">
              {quantity}
            </span>
          )}
          {equipped && (
            <span className="absolute left-1 top-1 text-[8px] text-[var(--cyan-400)]">E</span>
          )}
          {unique && (
            <span
              className={cn(
                "absolute text-[var(--gold-400)] drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]",
                hotlist ? "right-1 top-4" : "right-0.5 top-0.5"
              )}
              aria-label="Único"
            >
              <Star
                size={size === "sm" ? 9 : 12}
                fill="currentColor"
                strokeWidth={1.25}
              />
            </span>
          )}
          {hotlist && (
            <span className="absolute right-1 top-1 text-[8px] text-[var(--orange-400)]">H</span>
          )}
        </>
      )}
      {tooltip && (
        <span
          role="tooltip"
          className={cn(
            "pointer-events-none absolute bottom-full left-1/2 z-[var(--z-drop)] mb-2 w-44 -translate-x-1/2 rounded-xl border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.96)] p-2 text-left shadow-[var(--shadow-glass)]",
            "opacity-0 transition-opacity duration-[var(--t-ui)] group-hover:opacity-100 group-focus-visible:opacity-100"
          )}
        >
          <span className="block font-display text-[11px] text-[var(--text-1)]">{name}</span>
          {lootRarity ? (
            <span className="mt-0.5 block text-[10px] uppercase tracking-wider" style={{ color: accent }}>
              {LOOT_BOX_RARITY_LABEL[lootRarity]}
            </span>
          ) : !hideRarity ? (
            <span className="mt-0.5 block text-[10px] uppercase tracking-wider" style={{ color: accent }}>
              {RARITY_LABEL[rarity]}
            </span>
          ) : null}
          {unique ? (
            <span className="mt-0.5 block text-[10px] uppercase tracking-wider text-[var(--gold-400)]">Único</span>
          ) : null}
          {sourceLabel ? (
            <span className="mt-0.5 block text-[10px] leading-snug text-[var(--text-3)]">{sourceLabel}</span>
          ) : null}
          {detail && <span className="mt-1 block text-[11px] leading-snug text-[var(--text-2)]">{detail}</span>}
          {bonuses && bonuses.length > 0
            ? bonuses.map((line) => (
                <span key={line} className="mt-0.5 block text-[10px] leading-snug text-[var(--cyan-300)]">
                  {line}
                </span>
              ))
            : null}
        </span>
      )}
    </button>
  );
}
