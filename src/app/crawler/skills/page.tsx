"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { Crawler, Skill } from "@/lib/types";
import { BRAND } from "@/lib/copy";
import { SkillListItem } from "@/components/hud/SkillListItem";
import { sortSkillsStable } from "@/lib/skills";
import { useSkillTimer } from "@/hooks/useSkillTimer";

export default function CrawlerSkillsPage() {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
    if (!c) return;
    setCrawler(c as Crawler);
    const { data: sk } = await supabase
      .from("skills")
      .select("*, skill_catalog(*)")
      .eq("crawler_id", c.id)
      .order("created_at");
    setSkills(sortSkillsStable((sk as Skill[]) ?? []));
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!crawler?.id) return;
    const channel = supabase
      .channel(`crawler-skills:${crawler.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [crawler?.id, load, supabase]);

  const { open: advancementOpen } = useSkillTimer(crawler?.session_id);

  async function onToggleSkillCheck(skill: Skill, checked: boolean) {
    await supabase.rpc("set_skill_checked", { p_skill_id: skill.id, p_checked: checked });
    await load();
  }

  async function onAdjustSkillRank(skill: Skill, delta: -1 | 1) {
    await supabase.rpc("adjust_skill_rank", { p_skill_id: skill.id, p_delta: delta });
    await load();
  }

  if (!crawler) return null;

  return (
    <>
      <main className="space-y-4 p-4 pb-24">
        <GlassPanel
          title="Habilidades"
          subtitle={advancementOpen ? "Subida abierta — ajusta las skills marcadas" : "Marca las activas cuando las uses"}
        >
          {advancementOpen && (
            <p className="mb-3 rounded-lg border border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] px-3 py-2 text-[11px] text-[var(--cyan-400)]">
              El máster ha abierto la ventana. Sube o baja el rango de las skills que hayas marcado.
            </p>
          )}
          {skills.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">Aún no hay habilidades. {BRAND} las asignará.</p>
          ) : (
            <ul className="space-y-2">
              {sortSkillsStable(skills).map((s) => (
                <SkillListItem
                  key={s.id}
                  crawler={crawler}
                  skill={s}
                  canCheck={!advancementOpen}
                  canAdjustRank={advancementOpen && s.check_marks > 0 && s.skill_type !== "passive"}
                  onToggleCheck={onToggleSkillCheck}
                  onAdjustRank={onAdjustSkillRank}
                />
              ))}
            </ul>
          )}
        </GlassPanel>
      </main>
    </>
  );
}
