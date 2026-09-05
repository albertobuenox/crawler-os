"use client";

import { useEffect, useState } from "react";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { Button } from "@/components/ui/Button";
import { resourceThumbUrl } from "@/lib/item-art";
import { resourceBlurb } from "@/lib/resources";
import { slotFromResource } from "@/lib/loot";
import { bonusLines, isEquippable } from "@/lib/equipment";
import type { ItemInstance, Resource } from "@/lib/types";
import { cn } from "@/lib/utils";

export const INVENTORY_PAGE_SIZE = 12;

type BagItem = ItemInstance & { resource: Resource };

export function InventoryBagGrid({
  items,
  canCraft,
  canEquip,
  selectedId,
  draggingId,
  size = "lg",
  columnsClass = "grid-cols-3 sm:grid-cols-4",
  onCraft,
  onSelect,
  onEquip,
  onDragStart,
  onDragEnd,
}: {
  items: BagItem[];
  canCraft?: boolean;
  canEquip?: boolean;
  selectedId?: string | null;
  draggingId?: string | null;
  size?: "sm" | "md" | "lg";
  columnsClass?: string;
  onCraft?: () => void;
  onSelect?: (item: BagItem) => void;
  onEquip?: (item: BagItem) => void;
  onDragStart?: (event: React.DragEvent<HTMLButtonElement>, item: BagItem) => void;
  onDragEnd?: () => void;
}) {
  const plusIndex = canCraft ? items.length : -1;
  const pageCount = Math.max(1, Math.ceil((items.length + (canCraft ? 1 : 0)) / INVENTORY_PAGE_SIZE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const start = page * INVENTORY_PAGE_SIZE;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: pageCount }, (_, index) => (
          <Button
            key={index}
            type="button"
            variant={page === index ? "neon" : "ghost"}
            size="sm"
            onClick={() => setPage(index)}
          >
            {index + 1}
          </Button>
        ))}
      </div>
      <div className={cn("grid gap-2", columnsClass)}>
        {Array.from({ length: INVENTORY_PAGE_SIZE }, (_, offset) => {
          const index = start + offset;
          const item = items[index];
          if (item) {
            const equippable = Boolean(canEquip && isEquippable(item.resource));
            return (
              <InventorySlot
                key={item.id}
                name={item.resource.name}
                rarity={item.resource.rarity}
                quantity={item.quantity}
                iconUrl={resourceThumbUrl(item.resource)}
                detail={resourceBlurb(item.resource)}
                bonuses={bonusLines(item.resource)}
                selected={selectedId === item.id}
                size={size}
                showTooltip={draggingId !== item.id}
                draggable={equippable}
                onClick={onSelect ? () => onSelect(item) : undefined}
                onDoubleClick={equippable && onEquip ? () => onEquip(item) : undefined}
                onDragStart={
                  equippable && onDragStart
                    ? (event) => onDragStart(event, item)
                    : undefined
                }
                onDragEnd={onDragEnd}
                {...slotFromResource(item.resource)}
              />
            );
          }
          if (index === plusIndex) {
            return <InventorySlot key="craft" empty size={size} onAdd={onCraft} />;
          }
          return <InventorySlot key={`empty-${index}`} empty size={size} />;
        })}
      </div>
    </div>
  );
}
