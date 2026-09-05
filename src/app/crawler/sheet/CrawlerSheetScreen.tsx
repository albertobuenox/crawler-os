"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CharacterSheet } from "@/components/hud/CharacterSheet";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { updateCrawlerVitals } from "@/lib/crawler-vitals";
import { clampMana, lifeToBoxesFilled } from "@/lib/rules";
import type { Crawler, Skill, Spell, Effect, ItemInstance, Resource, StatModifierRow } from "@/lib/types";
import { sortSkillsStable } from "@/lib/skills";
import { sortSpellsStable } from "@/lib/spells";
import { useSkillTimer } from "@/hooks/useSkillTimer";
import { useEquipFlow } from "@/hooks/useEquipFlow";

type SheetItem = ItemInstance & { resource: Resource };

export function CrawlerSheetScreen({ crawlerId }: { crawlerId?: string }) {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [items, setItems] = useState<SheetItem[]>([]);
  const [modifiers, setModifiers] = useState<StatModifierRow[]>([]);
  const [missing, setMissing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    let target: Crawler | null = null;
    if (crawlerId) {
      const { data: member } = await supabase
        .from("session_members")
        .select("session_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!member) {
        setMissing(true);
        return;
      }
      const { data: c } = await supabase
        .from("crawlers")
        .select("*")
        .eq("id", crawlerId)
        .eq("session_id", member.session_id)
        .maybeSingle();
      target = (c as Crawler) ?? null;
    } else {
      const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
      target = (c as Crawler) ?? null;
    }

    if (!target) {
      setMissing(true);
      setCrawler(null);
      return;
    }

    setMissing(false);
    setCrawler(target);
    const [{ data: sk }, { data: sp }, { data: ef }, { data: it }, { data: mods }] = await Promise.all([
      supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", target.id).order("created_at"),
      supabase.from("spells").select("*, spell_catalog(*)").eq("crawler_id", target.id).order("created_at"),
      supabase.from("effects").select("*").eq("crawler_id", target.id),
      supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", target.id),
      supabase.from("modifiers").select("*").eq("crawler_id", target.id),
    ]);
    setSkills(sortSkillsStable((sk as Skill[]) ?? []));
    setSpells(sortSpellsStable((sp as Spell[]) ?? []));
    setEffects((ef as Effect[]) ?? []);
    setItems((it as SheetItem[]) ?? []);
    setModifiers((mods as StatModifierRow[]) ?? []);
  }, [crawlerId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!crawler?.id) return;
    const channel = supabase
      .channel(`sheet-skills:${crawler.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "spells" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "item_instances" }, () => void load())
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crawlers", filter: `id=eq.${crawler.id}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setMissing(true);
            setCrawler(null);
            return;
          }
          if (payload.new) {
            setCrawler((prev) => (prev ? { ...prev, ...(payload.new as Crawler) } : (payload.new as Crawler)));
            return;
          }
          void load();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [crawler?.id, load, supabase]);

  const { open: advancementOpen } = useSkillTimer(crawler?.session_id);
  const isOwnSheet = Boolean(crawler && userId && crawler.owner_user_id === userId);
  const canEditSkills = isOwnSheet;
  const canEditSpells = isOwnSheet;
  const canEditVitals = isOwnSheet;
  const equip = useEquipFlow(items, load);

  async function persistVitals(patch: { hp_boxes_filled?: number; mana_current?: number }) {
    if (!crawler) return;
    setCrawler((prev) => (prev ? { ...prev, ...patch } : prev));
    const { error } = await updateCrawlerVitals(crawler.id, patch);
    if (error) await load();
  }

  async function onToggleSkillCheck(skill: Skill, checked: boolean) {
    await supabase.rpc("set_skill_checked", { p_skill_id: skill.id, p_checked: checked });
    await load();
  }

  async function onAdjustSkillRank(skill: Skill, delta: -1 | 1) {
    await supabase.rpc("adjust_skill_rank", { p_skill_id: skill.id, p_delta: delta });
    await load();
  }

  async function onToggleSpellCheck(spell: Spell, checked: boolean) {
    await supabase.rpc("set_spell_checked", { p_spell_id: spell.id, p_checked: checked });
    await load();
  }

  async function onAdjustSpellRank(spell: Spell, delta: -1 | 1) {
    await supabase.rpc("adjust_spell_rank", { p_spell_id: spell.id, p_delta: delta });
    await load();
  }

  if (missing) return <p className="p-4 text-[var(--text-3)]">Sin hoja de personaje.</p>;
  if (!crawler) return <p className="p-4 text-[var(--text-3)]">Cargando hoja...</p>;

  return (
    <main className="p-3 pb-24 lg:p-4">
      <CharacterSheet
        crawler={crawler}
        skills={skills}
        spells={spells}
        effects={effects}
        items={items}
        modifiers={modifiers}
        canEditSkills={canEditSkills}
        canEditSpells={canEditSpells}
        canEditVitals={canEditVitals}
        canViewInventory={isOwnSheet}
        canEquip={isOwnSheet}
        advancementOpen={advancementOpen}
        onToggleSkillCheck={onToggleSkillCheck}
        onAdjustSkillRank={onAdjustSkillRank}
        onToggleSpellCheck={onToggleSpellCheck}
        onAdjustSpellRank={onAdjustSpellRank}
        onLifeChange={(life) => void persistVitals({ hp_boxes_filled: lifeToBoxesFilled(life) })}
        onManaChange={(mana) => void persistVitals({ mana_current: clampMana(mana, crawler.mana_max) })}
        onEquip={(itemId, slot) => {
          const item = items.find((entry) => entry.id === itemId);
          if (item) void equip.equip(item, slot);
        }}
        onUnequip={(itemId) => {
          const item = items.find((entry) => entry.id === itemId);
          if (item) void equip.unequip(item);
        }}
        onCrafted={() => void load()}
      />
      {equip.error ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{equip.error}</p>
      ) : null}
      <ConfirmModal
        open={!!equip.pending}
        title={equip.confirmCopy?.title ?? "¿Desequipar?"}
        body={equip.confirmCopy?.body}
        confirmLabel={equip.confirmCopy?.confirmLabel}
        loading={equip.busy}
        onCancel={() => {
          if (!equip.busy) equip.cancelPending();
        }}
        onConfirm={() => void equip.confirmPending()}
      />
    </main>
  );
}
