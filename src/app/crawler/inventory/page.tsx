"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { InventoryBagGrid } from "@/components/hud/InventoryBagGrid";
import { CrawlerCraftModal } from "@/components/hud/CrawlerCraftModal";
import type { Crawler, ItemInstance, Resource } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/copy";
import { resourceThumbUrl } from "@/lib/item-art";
import { resourceBlurb } from "@/lib/resources";
import { lootOriginLabel, slotFromResource } from "@/lib/loot";
import { useEquipFlow } from "@/hooks/useEquipFlow";
import {
  ACCESSORY_SLOTS,
  BODY_SLOTS,
  EQUIP_SLOT_LABEL,
  HAND_SLOTS,
  bonusLines,
  isEquippable,
  readItemDrag,
  resourceEquipSlot,
  slotAccepts,
  writeItemDrag,
} from "@/lib/equipment";

type SheetItem = ItemInstance & { resource: Resource };

function itemForSlot(items: SheetItem[], slot: string) {
  return items.find((item) => item.equipped_slot === slot) ?? null;
}

export default function CrawlerInventoryPage() {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [items, setItems] = useState<SheetItem[]>([]);
  const [selected, setSelected] = useState<SheetItem | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [crafting, setCrafting] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
    if (!c) return;
    setCrawler(c as Crawler);
    const { data } = await supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", c.id);
    const next = (data as SheetItem[]) ?? [];
    setItems(next);
    setSelected((current) => (current ? next.find((item) => item.id === current.id) ?? null : null));
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!crawler?.id) return;
    const channel = supabase
      .channel(`crawler-inventory:${crawler.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "item_instances" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [crawler?.id, load, supabase]);

  const equip = useEquipFlow(items, load);
  const dragging = items.find((item) => item.id === draggingId) ?? null;
  const draggingSlot = dragging ? resourceEquipSlot(dragging.resource) : null;
  const bag = items.filter((item) => !item.equipped_slot);
  const hotlist = items.filter((item) => item.hotlist_index !== null).sort((a, b) => (a.hotlist_index ?? 0) - (b.hotlist_index ?? 0));
  const bodySlots = [...BODY_SLOTS, ...HAND_SLOTS, ...ACCESSORY_SLOTS];

  function handleEquip(itemId: string, slot?: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (item) void equip.equip(item, slot);
  }

  function handleUnequip(itemId: string) {
    const item = items.find((entry) => entry.id === itemId);
    if (item) void equip.unequip(item);
  }

  if (!crawler) return null;

  return (
    <>
      <main className="space-y-4 p-4 pb-24">
        <GlassPanel title="Equipado" subtitle="Arrastra al slot o doble clic desde la mochila">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {bodySlots.map((slot) => {
              const item = itemForSlot(items, slot.id);
              const highlighted = slotAccepts(slot.id, draggingSlot);
              return (
                <div key={slot.id} className="flex flex-col items-center gap-1">
                  <InventorySlot
                    name={item?.resource.name}
                    rarity={item?.resource.rarity}
                    iconUrl={item ? resourceThumbUrl(item.resource) : null}
                    detail={item ? resourceBlurb(item.resource) : undefined}
                    bonuses={item ? bonusLines(item.resource) : undefined}
                    empty={!item}
                    highlighted={highlighted}
                    equipped={!!item}
                    showTooltip={!!item && !highlighted}
                    draggable={!!item}
                    onClick={item ? () => setSelected(item) : undefined}
                    onDoubleClick={item ? () => handleUnequip(item.id) : undefined}
                    onDragStart={
                      item
                        ? (event) => {
                            writeItemDrag(event, item.id);
                            setDraggingId(item.id);
                          }
                        : undefined
                    }
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={
                      highlighted
                        ? (event) => {
                            event.preventDefault();
                          }
                        : undefined
                    }
                    onDrop={
                      highlighted
                        ? (event) => {
                            event.preventDefault();
                            const id = readItemDrag(event);
                            setDraggingId(null);
                            if (id) handleEquip(id, slot.id);
                          }
                        : undefined
                    }
                    {...(item ? slotFromResource(item.resource) : {})}
                  />
                  <span className="text-center text-[8px] uppercase tracking-[0.14em] text-[var(--text-4)]">{slot.label}</span>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel title="Acceso rápido" subtitle="Hotlist">
          <div className="grid grid-cols-5 gap-2">
            {hotlist.length === 0 ? (
              <p className="col-span-5 text-sm text-[var(--text-3)]">Hotlist vacía.</p>
            ) : hotlist.map((i) => (
              <InventorySlot
                key={i.id}
                name={i.resource.name}
                rarity={i.resource.rarity}
                iconUrl={resourceThumbUrl(i.resource)}
                detail={resourceBlurb(i.resource)}
                bonuses={bonusLines(i.resource)}
                showTooltip
                hotlist
                onClick={() => setSelected(i)}
                {...slotFromResource(i.resource)}
              />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel title="Inventario" subtitle="Doble clic para equipar. El + crea un objeto de prueba.">
          <div
            onDragOver={(event) => {
              if (!dragging?.equipped_slot) return;
              event.preventDefault();
            }}
            onDrop={(event) => {
              event.preventDefault();
              const id = readItemDrag(event);
              setDraggingId(null);
              if (id) handleUnequip(id);
            }}
          >
            <InventoryBagGrid
              items={bag}
              canCraft
              canEquip
              selectedId={selected?.id}
              draggingId={draggingId}
              columnsClass="grid-cols-4 sm:grid-cols-6"
              onCraft={() => setCrafting(true)}
              onSelect={setSelected}
              onEquip={(item) => handleEquip(item.id)}
              onDragStart={(event, item) => {
                writeItemDrag(event, item.id);
                setDraggingId(item.id);
              }}
              onDragEnd={() => setDraggingId(null)}
            />
          </div>
        </GlassPanel>

        {equip.error ? (
          <p className="text-sm text-[var(--danger)]">{equip.error}</p>
        ) : null}

        {selected && (
          <GlassPanel title={selected.resource.name}>
            <p className="text-[var(--text-cyan)]">
              {lootOriginLabel(selected.resource) ?? RARITY_LABEL[selected.resource.rarity]}
              {selected.resource.is_unique ? " · Único" : ""}
              {resourceEquipSlot(selected.resource)
                ? ` · ${EQUIP_SLOT_LABEL[resourceEquipSlot(selected.resource) ?? ""]}`
                : ""}
            </p>
            <p className="mt-2 text-sm">{resourceBlurb(selected.resource)}</p>
            {bonusLines(selected.resource).length > 0 ? (
              <ul className="mt-3 space-y-1">
                {bonusLines(selected.resource).map((line) => (
                  <li key={line} className="text-sm text-[var(--cyan-300)]">{line}</li>
                ))}
              </ul>
            ) : null}
            {isEquippable(selected.resource) ? (
              <Button
                variant="energy"
                className="mt-4"
                size="sm"
                disabled={equip.busy}
                onClick={() => {
                  if (selected.equipped_slot) handleUnequip(selected.id);
                  else handleEquip(selected.id);
                }}
              >
                {selected.equipped_slot ? "Desequipar" : "Equipar"}
              </Button>
            ) : (
              <Button variant="neon" className="mt-4" size="sm">Usar (avisar al Dungeon Master)</Button>
            )}
          </GlassPanel>
        )}
      </main>

      <CrawlerCraftModal
        open={crafting}
        sessionId={crawler.session_id}
        onClose={() => setCrafting(false)}
        onCreated={() => {
          setCrafting(false);
          void load();
        }}
      />

      <ConfirmModal
        open={!!equip.pending}
        title={equip.confirmCopy?.title ?? "¿Desequipar?"}
        body={equip.confirmCopy?.body}
        confirmLabel={equip.confirmCopy?.confirmLabel}
        loading={equip.busy}
        onCancel={() => {
          if (!equip.busy) equip.cancelPending();
        }}
        onConfirm={() => void equip.confirmPending()}
      />
    </>
  );
}
