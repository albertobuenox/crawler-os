"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { CrawlerStatusStrip } from "@/components/layout/Nav";
import { InventorySlot } from "@/components/hud/InventorySlot";
import type { Crawler, ItemInstance, Resource } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/copy";

export default function CrawlerInventoryPage() {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [items, setItems] = useState<(ItemInstance & { resource: Resource })[]>([]);
  const [selected, setSelected] = useState<(ItemInstance & { resource: Resource }) | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
    if (!c) return;
    setCrawler(c as Crawler);
    const { data } = await supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", c.id);
    setItems((data as (ItemInstance & { resource: Resource })[]) ?? []);
  }

  const hotlist = items.filter((i) => i.hotlist_index !== null).sort((a, b) => (a.hotlist_index ?? 0) - (b.hotlist_index ?? 0));

  if (!crawler) return null;

  return (
    <>
      <CrawlerStatusStrip name={crawler.name} level={crawler.level} hpBoxes={crawler.hp_boxes_filled} conEnhanced={crawler.con_enhanced} mana={crawler.mana_current} manaMax={crawler.mana_max} />
      <main className="space-y-4 p-4 pb-24">
        <GlassPanel title="Acceso rápido" subtitle="Hotlist">
          <div className="grid grid-cols-5 gap-2">
            {hotlist.length === 0 ? (
              <p className="col-span-5 text-sm text-[var(--text-3)]">Hotlist vacía.</p>
            ) : hotlist.map((i) => (
              <InventorySlot key={i.id} name={i.resource.name} rarity={i.resource.rarity} hotlist onClick={() => setSelected(i)} />
            ))}
          </div>
        </GlassPanel>

        <GlassPanel title="Inventario">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">Aquí no hay nada salvo pelusa y malas decisiones.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {items.map((i) => (
                <InventorySlot
                  key={i.id}
                  name={i.resource.name}
                  rarity={i.resource.rarity}
                  quantity={i.quantity}
                  equipped={!!i.equipped_slot}
                  selected={selected?.id === i.id}
                  onClick={() => setSelected(i)}
                />
              ))}
            </div>
          )}
        </GlassPanel>

        {selected && (
          <GlassPanel title={selected.resource.name}>
            <p className="text-[var(--text-cyan)]">{RARITY_LABEL[selected.resource.rarity]}</p>
            <p className="mt-2 text-sm">{selected.resource.system_copy ?? selected.resource.description}</p>
            <Button variant="neon" className="mt-4" size="sm">Usar (avisar al Dungeon Master)</Button>
          </GlassPanel>
        )}
      </main>
    </>
  );
}
