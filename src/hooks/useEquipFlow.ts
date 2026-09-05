"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  equipmentNeedsUniqueConfirm,
  firstOpenSlot,
  occupantInSlot,
  resourceEquipSlot,
  uniqueSwapCopy,
  uniqueUnequipCopy,
} from "@/lib/equipment";
import type { ItemInstance, Resource } from "@/lib/types";

type SheetItem = ItemInstance & { resource: Resource };

type Pending =
  | { kind: "unequip"; item: SheetItem }
  | { kind: "swap"; item: SheetItem; slot: string; occupant: SheetItem };

export function useEquipFlow(items: SheetItem[], onChanged: () => Promise<void> | void) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState("");

  const persist = useCallback(
    async (itemId: string, slot: string | null) => {
      setBusy(true);
      setError("");
      const { error: rpcError } = await supabase.rpc("set_item_equipped", {
        p_item_id: itemId,
        p_slot: slot,
      });
      setBusy(false);
      if (rpcError) {
        setError(rpcError.message);
        return rpcError.message;
      }
      await onChanged();
      return null;
    },
    [onChanged, supabase],
  );

  const equip = useCallback(
    async (item: SheetItem, preferredSlot?: string) => {
      const itemSlot = resourceEquipSlot(item.resource);
      if (!itemSlot) return "Ese objeto no se equipa.";
      const slot = preferredSlot ?? firstOpenSlot(itemSlot, items, item.id);
      if (!slot) return "No hay slot para ese equipo.";
      const occupant = occupantInSlot(items, slot);
      if (occupant && occupant.id !== item.id && equipmentNeedsUniqueConfirm(occupant)) {
        setPending({ kind: "swap", item, slot, occupant });
        return null;
      }
      return persist(item.id, slot);
    },
    [items, persist],
  );

  const unequip = useCallback(
    async (item: SheetItem) => {
      if (!item.equipped_slot) return null;
      if (equipmentNeedsUniqueConfirm(item)) {
        setPending({ kind: "unequip", item });
        return null;
      }
      return persist(item.id, null);
    },
    [persist],
  );

  const confirmPending = useCallback(async () => {
    if (!pending) return null;
    const itemId = pending.kind === "unequip" ? pending.item.id : pending.item.id;
    const slot = pending.kind === "unequip" ? null : pending.slot;
    setPending(null);
    return persist(itemId, slot);
  }, [pending, persist]);

  const copy =
    pending?.kind === "unequip"
      ? uniqueUnequipCopy(pending.item.resource.name)
      : pending?.kind === "swap"
        ? uniqueSwapCopy(pending.occupant.resource.name)
        : null;

  return {
    busy,
    error,
    pending,
    confirmCopy: copy,
    equip,
    unequip,
    confirmPending,
    cancelPending: () => setPending(null),
  };
}
