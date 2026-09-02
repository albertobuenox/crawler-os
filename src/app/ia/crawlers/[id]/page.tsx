"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { HealthBoxes, ResourceBar } from "@/components/hud/HealthBoxes";
import { StatGrid } from "@/components/hud/StatKPI";
import type { Crawler, Skill, Effect } from "@/lib/types";
import { statModifier } from "@/lib/rules";

export default function IACrawlerSheetPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: sk }, { data: ef }] = await Promise.all([
        supabase.from("crawlers").select("*").eq("id", id).single(),
        supabase.from("skills").select("*").eq("crawler_id", id),
        supabase.from("effects").select("*").eq("crawler_id", id),
      ]);
      setCrawler(c as Crawler);
      setSkills((sk as Skill[]) ?? []);
      setEffects((ef as Effect[]) ?? []);
    })();
  }, [id, supabase]);

  async function save() {
    if (!crawler) return;
    setSaving(true);
    await supabase.from("crawlers").update({
      name: crawler.name,
      level: crawler.level,
      str_base: crawler.str_base,
      int_base: crawler.int_base,
      con_base: crawler.con_base,
      dex_base: crawler.dex_base,
      cha_base: crawler.cha_base,
      str_enhanced: crawler.str_enhanced,
      int_enhanced: crawler.int_enhanced,
      con_enhanced: crawler.con_enhanced,
      dex_enhanced: crawler.dex_enhanced,
      cha_enhanced: crawler.cha_enhanced,
      hp_boxes_filled: crawler.hp_boxes_filled,
      mana_current: crawler.mana_current,
      dr_total: crawler.dr_total,
      ai_favor_remaining: crawler.ai_favor_remaining,
      notes: crawler.notes,
      past_trauma: crawler.past_trauma,
      personal_space: crawler.personal_space,
      pet: crawler.pet,
      sponsors: crawler.sponsors,
    }).eq("id", crawler.id);
    setSaving(false);
  }

  async function applyDamage(amount: number) {
    await supabase.rpc("apply_damage", { p_crawler_id: id, p_damage: amount });
    const { data } = await supabase.from("crawlers").select("*").eq("id", id).single();
    setCrawler(data as Crawler);
  }

  if (!crawler) return <p className="text-[var(--text-3)]">Loading sheet...</p>;

  const stats = (["str", "int", "con", "dex", "cha"] as const).map((s) => ({
    key: s.toUpperCase(),
    value: crawler[`${s}_enhanced`],
    mod: statModifier(crawler[`${s}_enhanced`]),
  }));

  return (
    <div className="space-y-6">
        <div className="flex justify-between">
        <h2 className="font-display text-xl">{crawler.name}</h2>
        <div className="flex gap-2">
          <Link href={`/ia/crawlers/${id}/skills`}><Button variant="neon" size="sm">Skills</Button></Link>
          <Button variant="session" loading={saving} onClick={save}>Save</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel className="lg:col-span-2" title="Character Sheet">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={crawler.name} onChange={(e) => setCrawler({ ...crawler, name: e.target.value })} />
            <Input label="Level" type="number" value={crawler.level} onChange={(e) => setCrawler({ ...crawler, level: +e.target.value })} />
            <Input label="Race" value={crawler.race ?? ""} onChange={(e) => setCrawler({ ...crawler, race: e.target.value })} />
            <Input label="Class" value={crawler.class_name ?? ""} onChange={(e) => setCrawler({ ...crawler, class_name: e.target.value })} />
          </div>
          <div className="mt-6">
            <StatGrid stats={stats} />
          </div>
          <div className="mt-6 space-y-4">
            <HealthBoxes boxesFilled={crawler.hp_boxes_filled} conEnhanced={crawler.con_enhanced} />
            <ResourceBar label="Mana" current={crawler.mana_current} max={crawler.mana_max} />
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="danger" size="sm" onClick={() => applyDamage(10)}>Damage 10</Button>
            <Button variant="neon" size="sm" onClick={() => setCrawler({ ...crawler, hp_boxes_filled: Math.max(0, crawler.hp_boxes_filled - 1) })}>Heal 1 box</Button>
          </div>
          <Textarea label="Notes" className="mt-4" value={crawler.notes ?? ""} onChange={(e) => setCrawler({ ...crawler, notes: e.target.value })} />
        </GlassPanel>

        <div className="space-y-4">
          <GlassPanel title="AI Favor">
            <StatGrid stats={[{ key: "Remaining", value: crawler.ai_favor_remaining }]} />
          </GlassPanel>
          <GlassPanel title="Active Effects">
            {effects.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">No effects</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {effects.map((e) => (
                  <li key={e.id} className="well px-2 py-1 capitalize">{e.name} ({e.effect_kind})</li>
                ))}
              </ul>
            )}
          </GlassPanel>
          <GlassPanel title="Skills">
            {skills.map((s) => (
              <div key={s.id} className="well mb-2 px-2 py-1 text-sm">
                {s.name} — rank {s.rank} ({s.skill_type})
              </div>
            ))}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
