"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { InventorySlot } from "@/components/hud/InventorySlot";
import type { Crawler, ItemInstance, Resource } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/copy";
import { resourceBlurb } from "@/lib/resources";

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
      <main className="space-y-4 p-4 pb-24">
        <GlassPanel title="Acceso rápido" subtitle="Hotlist">
          <div className="grid grid-cols-5 gap-2">
            {hotlist.length === 0 ? (
              <p className="col-span-5 text-sm text-[var(--text-3)]">Hotlist vacía.</p>
            ) : hotlist.map((i) => (
              <InventorySlot
                key={i.id}
                name={i.resource.name}
                rarity={i.resource.rarity}
                iconUrl={i.resource.icon_url}
                detail={resourceBlurb(i.resource)}
                showTooltip
                hotlist
                onClick={() => setSelected(i)}
              />
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
                  iconUrl={i.resource.icon_url}
                  detail={resourceBlurb(i.resource)}
                  showTooltip
                  onClick={() => setSelected(i)}
                />
              ))}
            </div>
          )}
        </GlassPanel>

        {selected && (
          <GlassPanel title={selected.resource.name}>
            <p className="text-[var(--text-cyan)]">{RARITY_LABEL[selected.resource.rarity]}</p>
            <p className="mt-2 text-sm">{resourceBlurb(selected.resource)}</p>
            <Button variant="neon" className="mt-4" size="sm">Usar (avisar al Dungeon Master)</Button>
          </GlassPanel>
        )}
      </main>
    </>
  );
}
