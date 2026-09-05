"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CharacterSheet } from "@/components/hud/CharacterSheet";
import { sortSkillsStable } from "@/lib/skills";
import { sortSpellsStable } from "@/lib/spells";
import { useSkillTimer } from "@/hooks/useSkillTimer";
import type { Crawler, Effect, ItemInstance, Resource, Skill, Spell, StatModifierRow } from "@/lib/types";

type SheetItem = ItemInstance & { resource: Resource };

export function SceneSheetPanel({
  crawlerId,
  sessionId,
  onClose,
}: {
  crawlerId: string;
  sessionId?: string;
  onClose?: () => void;
}) {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [items, setItems] = useState<SheetItem[]>([]);
  const [modifiers, setModifiers] = useState<StatModifierRow[]>([]);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data: c } = await supabase.from("crawlers").select("*").eq("id", crawlerId).maybeSingle();
    if (!c) {
      setMissing(true);
      setCrawler(null);
      return;
    }
    setMissing(false);
    setCrawler(c as Crawler);
    const [{ data: sk }, { data: sp }, { data: ef }, { data: it }, { data: mods }] = await Promise.all([
      supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", crawlerId).order("created_at"),
      supabase.from("spells").select("*, spell_catalog(*)").eq("crawler_id", crawlerId).order("created_at"),
      supabase.from("effects").select("*").eq("crawler_id", crawlerId),
      supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", crawlerId),
      supabase.from("modifiers").select("*").eq("crawler_id", crawlerId),
    ]);
    setSkills(sortSkillsStable((sk as Skill[]) ?? []));
    setSpells(sortSpellsStable((sp as Spell[]) ?? []));
    setEffects((ef as Effect[]) ?? []);
    setItems((it as SheetItem[]) ?? []);
    setModifiers((mods as StatModifierRow[]) ?? []);
  }, [crawlerId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`dm-scene-sheet:${crawlerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "spells" }, () => void load())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crawlers", filter: `id=eq.${crawlerId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [crawlerId, load, supabase]);

  const { open: advancementOpen } = useSkillTimer(sessionId ?? crawler?.session_id);

  return (
    <aside className="absolute inset-y-0 right-0 z-20 flex w-[min(440px,46vw)] min-h-0 flex-col overflow-hidden rounded-[20px] border border-[var(--stroke-magenta)] bg-[rgba(5,6,13,0.88)] shadow-[var(--glow-magenta)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--stroke-glass)] px-4 py-3">
        <p className="font-display text-xs tracking-[0.16em] text-[var(--magenta-400)]">HOJA DE PERSONAJE</p>
        {onClose && (
          <button
            type="button"
            aria-label="Cerrar hoja"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {missing && <p className="text-sm text-[var(--text-3)]">Ese crawler ya no está en el piso.</p>}
        {!missing && !crawler && <p className="text-sm text-[var(--text-3)]">Cargando hoja...</p>}
        {crawler && (
          <CharacterSheet
            crawler={crawler}
            skills={skills}
            spells={spells}
            effects={effects}
            items={items}
            modifiers={modifiers}
            canViewInventory
            advancementOpen={advancementOpen}
          />
        )}
      </div>
    </aside>
  );
}
