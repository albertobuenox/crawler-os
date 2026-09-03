"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { CinematicOverlay } from "@/components/hud/CinematicOverlay";
import type { LootBox, Resource } from "@/lib/types";
import { BRAND } from "@/lib/copy";

export default function CrawlerLootPage() {
  const supabase = createClient();
  const [boxes, setBoxes] = useState<(LootBox & { resource: Resource })[]>([]);
  const [opening, setOpening] = useState<(LootBox & { resource: Resource }) | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: c } = await supabase.from("crawlers").select("id, session_id").eq("owner_user_id", user.id).maybeSingle();
    if (!c) return;
    const { data } = await supabase
      .from("loot_boxes")
      .select("*, resource:resources(*)")
      .eq("session_id", c.session_id)
      .or(`assigned_crawler_id.eq.${c.id},assigned_crawler_id.is.null`)
      .eq("status", "sealed");
    setBoxes((data as (LootBox & { resource: Resource })[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("crawler-loot")
      .on("postgres_changes", { event: "*", schema: "public", table: "loot_boxes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, supabase]);

  async function openBox(box: LootBox & { resource: Resource }) {
    setOpening(box);
    await supabase.from("loot_boxes").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", box.id);
  }

  return (
    <main className="p-4 pb-24">
      <GlassPanel title="Cajas de loot">
        {boxes.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">Ninguna caja sellada. {BRAND} acapara.</p>
        ) : (
          boxes.map((b) => (
            <div key={b.id} className="well mb-2 flex items-center justify-between p-3">
              <span>{b.resource.name}</span>
              <Button variant="energy" size="sm" onClick={() => openBox(b)}>Abrir</Button>
            </div>
          ))
        )}
      </GlassPanel>

      <CinematicOverlay
        open={!!opening}
        type="loot_box"
        title="LOOT BOX"
        body={`${BRAND} ha decidido que te mereces un premio.`}
        itemName={opening?.resource.name}
        rarity={opening?.resource.rarity}
        onClose={() => { setOpening(null); load(); }}
      />
    </main>
  );
}
