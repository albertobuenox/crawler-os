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

  if (!crawler) return <p className="p-4 text-[var(--text-3)]">No character sheet.</p>;

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
            <ResourceBar label="Mana" current={crawler.mana_current} max={crawler.mana_max} />
          </div>
          <p className="mt-4 text-xs text-[var(--text-3)]">AI Favor: {crawler.ai_favor_remaining} remaining</p>
        </GlassPanel>

        {crawler.past_trauma && (
          <GlassPanel title="Past Trauma"><p className="text-sm">{crawler.past_trauma}</p></GlassPanel>
        )}

        <GlassPanel title="Active Effects">
          {effects.length === 0 ? <p className="text-sm text-[var(--text-3)]">None</p> : effects.map((e) => (
            <div key={e.id} className="well mb-1 px-2 py-1 text-sm capitalize">{e.name}</div>
          ))}
        </GlassPanel>

        <GlassPanel title="Personal Space">
          <pre className="text-xs text-[var(--text-2)]">{JSON.stringify(crawler.personal_space, null, 2) || "Empty"}</pre>
        </GlassPanel>

        <GlassPanel title="Pet">
          <pre className="text-xs">{JSON.stringify(crawler.pet, null, 2) || "No pet"}</pre>
        </GlassPanel>

        <GlassPanel title="Sponsors">
          <pre className="text-xs">{JSON.stringify(crawler.sponsors, null, 2) || "None"}</pre>
        </GlassPanel>
      </main>
    </>
  );
}
