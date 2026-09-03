"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { CrawlerStatusStrip } from "@/components/layout/Nav";
import type { Crawler, Skill } from "@/lib/types";
import { statModifier } from "@/lib/rules";
import { SKILL_TYPE_LABEL, BRAND } from "@/lib/copy";
import { skillRollLabel } from "@/lib/skills";

export default function CrawlerSkillsPage() {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
      if (!c) return;
      setCrawler(c as Crawler);
      const { data: sk } = await supabase
        .from("skills")
        .select("*, skill_catalog(*)")
        .eq("crawler_id", c.id);
      setSkills((sk as Skill[]) ?? []);
    })();
  }, [supabase]);

  if (!crawler) return null;

  return (
    <>
      <CrawlerStatusStrip name={crawler.name} level={crawler.level} hpBoxes={crawler.hp_boxes_filled} conEnhanced={crawler.con_enhanced} mana={crawler.mana_current} manaMax={crawler.mana_max} />
      <main className="space-y-4 p-4 pb-24">
        <GlassPanel title="Habilidades" subtitle="Avance cada 2h / 4h de juego">
          {skills.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">Aún no hay habilidades. {BRAND} las asignará.</p>
          ) : (
            <ul className="space-y-2">
              {skills.map((s) => (
                <li key={s.id} className="well flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <span className="font-semibold text-[var(--text-1)]">{s.name}</span>
                    <span className="ml-2 text-[var(--text-3)]">{SKILL_TYPE_LABEL[s.skill_type] ?? s.skill_type}</span>
                    {s.skill_catalog?.animal_only && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">solo animal</span>
                    )}
                    {s.skill_catalog && (
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                        d100 {skillRollLabel(s.skill_catalog.roll_min, s.skill_catalog.roll_max)} · pág. {s.skill_catalog.page_ref}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-stat text-[var(--cyan-400)]">Rango {s.rank}</span>
                    <span className="ml-2 text-xs text-[var(--text-4)]">
                      {s.linked_stat.toUpperCase()} {statModifier(crawler[`${s.linked_stat}_enhanced`]) >= 0 ? "+" : ""}
                      {statModifier(crawler[`${s.linked_stat}_enhanced`])}
                    </span>
                    {s.check_marks > 0 && (
                      <span className="ml-2 text-[var(--warn)]">✔×{s.check_marks}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      </main>
    </>
  );
}
