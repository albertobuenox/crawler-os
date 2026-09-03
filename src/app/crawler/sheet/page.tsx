"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { CrawlerStatusStrip } from "@/components/layout/Nav";
import { HealthBoxes, ResourceBar } from "@/components/hud/HealthBoxes";
import { StatGrid } from "@/components/hud/StatKPI";
import type { Crawler, Skill, Effect } from "@/lib/types";
import { statModifier } from "@/lib/rules";

export default function CrawlerSheetPage() {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
    if (!c) return;
    setCrawler(c as Crawler);
    const [{ data: sk }, { data: ef }] = await Promise.all([
      supabase.from("skills").select("*").eq("crawler_id", c.id),
      supabase.from("effects").select("*").eq("crawler_id", c.id),
    ]);
    setSkills((sk as Skill[]) ?? []);
    setEffects((ef as Effect[]) ?? []);
  }

  if (!crawler) return <p className="p-4 text-[var(--text-3)]">Sin hoja de personaje.</p>;

  const stats = (["str", "int", "con", "dex", "cha"] as const).map((s) => ({
    key: s.toUpperCase(),
    value: crawler[`${s}_enhanced`],
    mod: statModifier(crawler[`${s}_enhanced`]),
  }));

  return (
    <>
      <CrawlerStatusStrip name={crawler.name} level={crawler.level} hpBoxes={crawler.hp_boxes_filled} conEnhanced={crawler.con_enhanced} mana={crawler.mana_current} manaMax={crawler.mana_max} />
      <main className="space-y-4 p-4 pb-24">
        <GlassPanel title={crawler.name} subtitle={`${crawler.race ?? "—"} · ${crawler.class_name ?? "—"}`}>
          <StatGrid stats={stats} />
          <div className="mt-4 space-y-3">
            <HealthBoxes boxesFilled={crawler.hp_boxes_filled} conEnhanced={crawler.con_enhanced} />
            <ResourceBar label="Maná" current={crawler.mana_current} max={crawler.mana_max} />
          </div>
          <p className="mt-4 text-xs text-[var(--text-3)]">Favor del Sistema: {crawler.ai_favor_remaining} restante</p>
        </GlassPanel>

        {crawler.past_trauma && (
          <GlassPanel title="Trauma pasado"><p className="text-sm">{crawler.past_trauma}</p></GlassPanel>
        )}

        <GlassPanel title="Efectos activos">
          {effects.length === 0 ? <p className="text-sm text-[var(--text-3)]">Ninguno</p> : effects.map((e) => (
            <div key={e.id} className="well mb-1 px-2 py-1 text-sm capitalize">{e.name}</div>
          ))}
        </GlassPanel>

        <GlassPanel title="Espacio personal">
          <pre className="text-xs text-[var(--text-2)]">{JSON.stringify(crawler.personal_space, null, 2) || "Vacío"}</pre>
        </GlassPanel>

        <GlassPanel title="Mascota">
          <pre className="text-xs">{JSON.stringify(crawler.pet, null, 2) || "Sin mascota"}</pre>
        </GlassPanel>

        <GlassPanel title="Patrocinadores">
          <pre className="text-xs">{JSON.stringify(crawler.sponsors, null, 2) || "Ninguno"}</pre>
        </GlassPanel>
      </main>
    </>
  );
}
