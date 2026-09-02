import type { Rarity } from "@/lib/types";
import { RARITY_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface InventorySlotProps {
  name?: string;
  rarity?: Rarity;
  quantity?: number;
  equipped?: boolean;
  hotlist?: boolean;
  selected?: boolean;
  empty?: boolean;
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
  onClick,
}: InventorySlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex aspect-square w-full flex-col items-center justify-center rounded-xl border p-1 transition-all",
        empty
          ? "border-dashed border-[rgba(255,255,255,0.12)] bg-transparent"
          : "well hover:scale-105",
        selected && "ring-2 ring-[var(--cyan-400)] shadow-[var(--glow-cyan)]"
      )}
      style={
        !empty
          ? {
              borderColor: `${RARITY_COLORS[rarity]}88`,
              boxShadow: selected ? undefined : `0 0 8px ${RARITY_COLORS[rarity]}33`,
            }
          : undefined
      }
    >
      {!empty && (
        <>
          <span className="text-[10px] font-medium text-[var(--text-2)] line-clamp-2 text-center">
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
    </button>
  );
}
