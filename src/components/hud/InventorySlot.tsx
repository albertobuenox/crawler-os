import type { Rarity } from "@/lib/types";
import { RARITY_COLORS } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/copy";
import { cn } from "@/lib/utils";

interface InventorySlotProps {
  name?: string;
  rarity?: Rarity;
  quantity?: number;
  equipped?: boolean;
  hotlist?: boolean;
  selected?: boolean;
  empty?: boolean;
  iconUrl?: string | null;
  detail?: string;
  size?: "md" | "lg";
  showTooltip?: boolean;
  onClick?: () => void;
}

export function InventorySlot({
  name,
  rarity = "common",
  quantity,
  equipped,
  hotlist,
  selected,
  empty,
  iconUrl,
  detail,
  size = "md",
  showTooltip,
  onClick,
}: InventorySlotProps) {
  const tooltip = showTooltip && !empty && name;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={empty}
      aria-label={empty ? "Hueco vacío" : name}
      className={cn(
        "group relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border p-1 transition-[border-color,box-shadow,filter] duration-[var(--t-ui)]",
        size === "lg" ? "min-h-[72px] sm:min-h-[80px]" : "",
        empty
          ? "cursor-default border-dashed border-[rgba(255,255,255,0.12)] bg-transparent disabled:opacity-100"
          : "well cursor-pointer hover:brightness-110",
        selected && "ring-2 ring-[var(--cyan-400)] shadow-[var(--glow-cyan)]"
      )}
      style={
        !empty
          ? {
              borderColor: `${RARITY_COLORS[rarity]}88`,
              boxShadow: selected ? undefined : `0 0 10px ${RARITY_COLORS[rarity]}44`,
            }
          : undefined
      }
    >
      {!empty && (
        <>
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={iconUrl} alt="" className="mb-0.5 h-8 w-8 object-contain sm:h-10 sm:w-10" />
          ) : null}
          <span className="line-clamp-2 text-center text-[10px] font-medium text-[var(--text-2)]">
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
          <span className="mt-0.5 block text-[10px] uppercase tracking-wider" style={{ color: RARITY_COLORS[rarity] }}>
            {RARITY_LABEL[rarity]}
          </span>
          {detail && <span className="mt-1 block text-[11px] leading-snug text-[var(--text-2)]">{detail}</span>}
        </span>
      )}
    </button>
  );
}
