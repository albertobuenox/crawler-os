"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { Crawler, Spell } from "@/lib/types";
import { BRAND } from "@/lib/copy";
import { SpellListItem } from "@/components/hud/SpellListItem";
import { sortSpellsStable } from "@/lib/spells";
import { useSkillTimer } from "@/hooks/useSkillTimer";

export default function CrawlerSpellsPage() {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [spells, setSpells] = useState<Spell[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
    if (!c) return;
    setCrawler(c as Crawler);
    const { data: rows } = await supabase
      .from("spells")
      .select("*, spell_catalog(*)")
      .eq("crawler_id", c.id)
      .order("created_at");
    setSpells(sortSpellsStable((rows as Spell[]) ?? []));
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!crawler?.id) return;
    const channel = supabase
      .channel(`crawler-spells:${crawler.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "spells" }, () => void load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [crawler?.id, load, supabase]);

  const { open: advancementOpen } = useSkillTimer(crawler?.session_id);

  async function onToggleSpellCheck(spell: Spell, checked: boolean) {
    await supabase.rpc("set_spell_checked", { p_spell_id: spell.id, p_checked: checked });
    await load();
  }

  async function onAdjustSpellRank(spell: Spell, delta: -1 | 1) {
    await supabase.rpc("adjust_spell_rank", { p_spell_id: spell.id, p_delta: delta });
    await load();
  }

  if (!crawler) return null;

  return (
    <main className="space-y-4 p-4 pb-24">
      <GlassPanel
        title="Spells"
        subtitle={advancementOpen ? "Subida abierta — ajusta los spells marcados" : "Marca los activos cuando los uses"}
      >
        {advancementOpen && (
          <p className="mb-3 rounded-lg border border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] px-3 py-2 text-[11px] text-[var(--cyan-400)]">
            El máster ha abierto la ventana. Sube o baja el rango de los spells que hayas marcado.
          </p>
        )}
        {spells.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">Aún no hay conjuros. {BRAND} los asignará.</p>
        ) : (
          <ul className="space-y-2">
            {sortSpellsStable(spells).map((s) => (
              <SpellListItem
                key={s.id}
                crawler={crawler}
                spell={s}
                canCheck={!advancementOpen}
                canAdjustRank={advancementOpen && s.check_marks > 0}
                onToggleCheck={onToggleSpellCheck}
                onAdjustRank={onAdjustSpellRank}
              />
            ))}
          </ul>
        )}
      </GlassPanel>
    </main>
  );
}
