"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useSessionBroadcast } from "@/hooks/useSession";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { HealthBoxes, ResourceBar, useVitalPulse } from "@/components/hud/HealthBoxes";
import type { Crawler, Skill, Effect, SkillCatalogEntry, StatKey, StatModifierRow, ItemInstance, Resource } from "@/lib/types";
import { formatStat, collectStatBonusChips, healthBarColor } from "@/lib/rules";
import { SKILL_TYPE_LABEL } from "@/lib/copy";
import { defaultSkillType, SKILL_RANK_MIN, skillRollLabel, sortSkillsStable } from "@/lib/skills";
import { skillArtSlug } from "@/lib/skill-art";
import { SkillThumb } from "@/components/hud/SkillThumb";
import { Minus, Plus, X, Skull, ShieldAlert, Flame, Droplets, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatBlock } from "@/components/hud/StatBlock";

/* ── Preset negative effects ── */
const PRESET_EFFECTS: {
  name: string;
  effect_kind: "debuff" | "external";
  color: string;
  icon: typeof Skull;
}[] = [
  { name: "Veneno", effect_kind: "debuff", color: "#4ade80", icon: Droplets },
  { name: "Quemadura", effect_kind: "debuff", color: "#f97316", icon: Flame },
  { name: "Aturdido", effect_kind: "external", color: "#fbbf24", icon: Zap },
  { name: "Maldición", effect_kind: "debuff", color: "#a855f7", icon: Skull },
  { name: "Vulnerabilidad", effect_kind: "external", color: "#ff3b5c", icon: ShieldAlert },
];

/* ── Stat neon classes (same as CharacterSheet) ── */
const STAT_KEYS: StatKey[] = ["str", "int", "con", "dex", "cha"];
const STAT_NEON = [
  "text-[var(--cyan-400)] border-[var(--stroke-cyan)] shadow-[var(--glow-cyan)]",
  "text-[var(--magenta-400)] border-[var(--stroke-magenta)] shadow-[var(--glow-magenta)]",
  "text-[var(--gold-400)] border-[var(--stroke-reward)] shadow-[var(--glow-gold)]",
  "text-[var(--cyan-300)] border-[var(--stroke-cyan)] shadow-[var(--glow-cyan)]",
  "text-[var(--magenta-500)] border-[var(--stroke-magenta)] shadow-[var(--glow-magenta)]",
];

type SheetItem = ItemInstance & { resource: Resource };

/* ── AI Favor with yellow number and +/- ── */
function AIFavorEditor({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--stroke-glass)] text-[var(--text-3)] transition-colors hover:bg-white/10 hover:text-[var(--text-1)]"
      >
        <Minus size={14} />
      </button>
      <span className="font-stat text-3xl text-[var(--gold-400)]">{formatStat(value)}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--stroke-glass)] text-[var(--text-3)] transition-colors hover:bg-white/10 hover:text-[var(--text-1)]"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

/* ── Effect chip ── */
function EffectChip({
  name,
  color,
  icon: Icon,
  onRemove,
}: {
  name: string;
  color: string;
  icon?: typeof Skull;
  onRemove?: () => void;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
      style={{
        background: `${color}18`,
        border: `1px solid ${color}55`,
        color,
        boxShadow: `0 0 12px ${color}33`,
      }}
    >
      {Icon && <Icon size={12} />}
      {name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/10">
          <X size={10} />
        </button>
      )}
    </motion.span>
  );
}

/* ── Main page ── */
export default function DMCrawlerSheetPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [modifiers, setModifiers] = useState<StatModifierRow[]>([]);
  const [items, setItems] = useState<SheetItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [showEffectPicker, setShowEffectPicker] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([]);
  const { pulse, beat } = useVitalPulse();
  const { broadcast } = useSessionBroadcast(
    crawler?.session_id,
    useCallback(
      (event: string, payload: unknown) => {
        if (event !== "party_patch" || !payload || typeof payload !== "object" || !("id" in payload)) return;
        const patch = payload as Partial<Crawler> & { id: string };
        if (patch.id !== id) return;
        setCrawler((prev) =>
          prev
            ? {
                ...prev,
                ...(patch.hp_boxes_filled !== undefined ? { hp_boxes_filled: patch.hp_boxes_filled } : {}),
                ...(patch.mana_current !== undefined ? { mana_current: patch.mana_current } : {}),
                ...(patch.avatar_emotion !== undefined ? { avatar_emotion: patch.avatar_emotion } : {}),
                ...(patch.status ? { status: patch.status } : {}),
              }
            : prev
        );
      },
      [id]
    )
  );

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`dm-crawler:${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "crawlers", filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as Crawler;
          setCrawler((prev) =>
            prev
              ? {
                  ...prev,
                  hp_boxes_filled: row.hp_boxes_filled,
                  mana_current: row.mana_current,
                  mana_max: row.mana_max,
                  avatar_emotion: row.avatar_emotion,
                  status: row.status,
                  level: row.level,
                }
              : prev
          );
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, supabase]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: sk }, { data: ef }, { data: mods }, { data: it }] = await Promise.all([
        supabase.from("crawlers").select("*").eq("id", id).single(),
        supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", id).order("created_at"),
        supabase.from("effects").select("*").eq("crawler_id", id),
        supabase.from("modifiers").select("*").eq("crawler_id", id),
        supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", id),
      ]);
      setCrawler(c as Crawler);
      setSkills(sortSkillsStable((sk as Skill[]) ?? []));
      setEffects((ef as Effect[]) ?? []);
      setModifiers((mods as StatModifierRow[]) ?? []);
      setItems((it as SheetItem[]) ?? []);
    })();
    supabase
      .from("skill_catalog")
      .select("*")
      .order("roll_min")
      .then(({ data }) => setCatalog((data as SkillCatalogEntry[]) ?? []));
  }, [id, supabase]);

  async function reloadSkills() {
    const { data } = await supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", id).order("created_at");
    setSkills(sortSkillsStable((data as Skill[]) ?? []));
  }

  async function reloadEffects() {
    const { data } = await supabase.from("effects").select("*").eq("crawler_id", id);
    setEffects((data as Effect[]) ?? []);
  }

  async function save() {
    if (!crawler) return;
    setSaving(true);
    await supabase.from("crawlers").update({
      name: crawler.name,
      crawler_number: crawler.crawler_number?.trim() || null,
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
      mana_max: crawler.mana_max,
      dr_total: crawler.dr_total,
      ai_favor_remaining: crawler.ai_favor_remaining,
      race: crawler.race,
      class_name: crawler.class_name || null,
      notes: crawler.notes,
      past_trauma: crawler.past_trauma,
      personal_space: crawler.personal_space,
      pet: crawler.pet,
      sponsors: crawler.sponsors,
    }).eq("id", crawler.id);
    setSaving(false);
  }

  async function persistLiveVitals(patch: { hp_boxes_filled?: number; mana_current?: number }) {
    if (!crawler) return;
    setCrawler((prev) => (prev ? { ...prev, ...patch } : prev));
    await supabase.from("crawlers").update(patch).eq("id", crawler.id);
    await broadcast("party_patch", { id: crawler.id, ...patch });
  }

  function updateStat(key: StatKey, value: number) {
    if (!crawler) return;
    const bonus = crawler[`${key}_enhanced`] - crawler[`${key}_base`];
    const nextEnhanced = value + bonus;
    setCrawler({
      ...crawler,
      [`${key}_base`]: value,
      [`${key}_enhanced`]: nextEnhanced,
      ...(key === "int" ? { mana_max: nextEnhanced, mana_current: Math.min(crawler.mana_current, nextEnhanced) } : {}),
    });
  }

  async function addPresetEffect(preset: typeof PRESET_EFFECTS[number]) {
    if (!crawler) return;
    await supabase.from("effects").insert({
      crawler_id: crawler.id,
      name: preset.name,
      effect_kind: preset.effect_kind,
      is_stackable: false,
      payload: { color: preset.color },
    });
    await reloadEffects();
  }

  async function removeEffect(effectId: string) {
    await supabase.from("effects").delete().eq("id", effectId);
    await reloadEffects();
  }

  function presetForEffect(e: Effect): typeof PRESET_EFFECTS[number] | undefined {
    return PRESET_EFFECTS.find((p) => p.name === e.name);
  }

  const ownedSkillIds = useMemo(
    () => new Set(skills.map((s) => s.catalog_id).filter(Boolean)),
    [skills]
  );

  async function addSkillFromCatalog(entry: SkillCatalogEntry) {
    if (ownedSkillIds.has(entry.id)) return;
    await supabase.from("skills").insert({
      crawler_id: id,
      catalog_id: entry.id,
      name: entry.name,
      skill_type: defaultSkillType(entry),
      rank: SKILL_RANK_MIN,
      linked_stat: "str" as StatKey,
    });
    await reloadSkills();
  }

  async function removeSkill(skillId: string) {
    await supabase.from("skills").delete().eq("id", skillId);
    await reloadSkills();
  }

  if (!crawler) return <p className="text-[var(--text-3)]">Cargando hoja...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="font-display text-xl">{crawler.name}</h2>
        <Button variant="session" loading={saving} onClick={save}>Guardar</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column: character sheet ── */}
        <GlassPanel
          className="!overflow-visible lg:col-span-2"
          title="Hoja de personaje"
          pulseKey={pulse.key}
          pulseColor={pulse.color}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" value={crawler.name} onChange={(e) => setCrawler({ ...crawler, name: e.target.value })} />
            <Input
              label="Mazmorrero N"
              value={crawler.crawler_number ?? ""}
              onChange={(e) => setCrawler({ ...crawler, crawler_number: e.target.value || null })}
            />
            <Input label="Nivel" type="number" value={crawler.level} onChange={(e) => setCrawler({ ...crawler, level: +e.target.value })} />
            <Input label="Raza" value={crawler.race ?? ""} onChange={(e) => setCrawler({ ...crawler, race: e.target.value })} />
            <Input
              label="Clase"
              placeholder="La adquiere más adelante"
              value={crawler.class_name ?? ""}
              onChange={(e) => setCrawler({ ...crawler, class_name: e.target.value || null })}
            />
          </div>

          {/* Stats — clic edita el base; el enhanced y el modificador se calculan */}
          <div className="mt-6 grid grid-cols-5 gap-1.5 overflow-visible">
            {STAT_KEYS.map((key, i) => (
              <StatBlock
                key={key}
                statKey={key}
                base={crawler[`${key}_base`]}
                enhanced={crawler[`${key}_enhanced`]}
                bonuses={collectStatBonusChips(
                  key,
                  modifiers,
                  [
                    ...effects.map((e) => ({ id: e.id, name: e.name })),
                    ...items.map((it) => ({ id: it.resource.id, name: it.resource.name })),
                    ...items.map((it) => ({ id: it.id, name: it.resource.name })),
                  ],
                  items.filter((it) => it.equipped_slot)
                )}
                neonClass={STAT_NEON[i]}
                editable
                onBaseChange={(v) => updateStat(key, v)}
              />
            ))}
          </div>

          {/* Health */}
          <div className="mt-6 space-y-4">
            <HealthBoxes
              boxesFilled={crawler.hp_boxes_filled}
              conEnhanced={crawler.con_enhanced}
              interactive
              onLifeChange={(life) => {
                beat(healthBarColor(life));
                void persistLiveVitals({ hp_boxes_filled: 10 - life });
              }}
            />
            <ResourceBar
              label="Maná"
              current={crawler.mana_current}
              max={crawler.mana_max}
              interactive
              onCurrentChange={(mana) => void persistLiveVitals({ mana_current: mana })}
            />
          </div>
          <Textarea label="Notas" className="mt-4" value={crawler.notes ?? ""} onChange={(e) => setCrawler({ ...crawler, notes: e.target.value })} />
        </GlassPanel>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* AI Favor — editable, yellow */}
          <GlassPanel title="Favor de la IA">
            <AIFavorEditor
              value={crawler.ai_favor_remaining}
              onChange={(v) => setCrawler({ ...crawler, ai_favor_remaining: v })}
            />
          </GlassPanel>

          {/* Effects — chips + picker */}
          <GlassPanel
            title="Efectos activos"
            action={
              <Button variant="neon" size="sm" onClick={() => setShowEffectPicker(!showEffectPicker)}>
                {showEffectPicker ? "Cerrar" : "+ Añadir"}
              </Button>
            }
          >
            <AnimatePresence mode="popLayout">
              {effects.length === 0 && !showEffectPicker && (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-[var(--text-3)]"
                >
                  Sin efectos — pulsa añadir
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-2">
              <AnimatePresence mode="popLayout">
                {effects.map((e) => {
                  const preset = presetForEffect(e);
                  const color = (e.payload as Record<string, string>)?.color ?? preset?.color ?? "var(--text-3)";
                  return (
                    <EffectChip
                      key={e.id}
                      name={e.name}
                      color={color}
                      icon={preset?.icon}
                      onRemove={() => removeEffect(e.id)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {showEffectPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-[var(--text-4)]">Aplicar efecto</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_EFFECTS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => addPresetEffect(p)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 hover:brightness-125 cursor-pointer"
                        style={{
                          background: `${p.color}18`,
                          border: `1px solid ${p.color}55`,
                          color: p.color,
                        }}
                      >
                        <p.icon size={12} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>

          {/* Skills — inline add from catalog */}
          <GlassPanel
            title="Habilidades"
            action={
              <Button variant="neon" size="sm" onClick={() => setShowSkillPicker(!showSkillPicker)}>
                {showSkillPicker ? "Cerrar" : "+ Añadir"}
              </Button>
            }
          >
            {skills.length === 0 && !showSkillPicker && (
              <p className="text-sm text-[var(--text-3)]">Sin habilidades todavía.</p>
            )}
            <AnimatePresence mode="popLayout">
              {skills.map((s) => (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="well mb-2 flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <SkillThumb slug={skillArtSlug(s)} skillType={s.skill_type} thumbUrl={s.skill_catalog?.thumb_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-[var(--text-1)]">{s.name}</span>
                    <span className="ml-2 text-[var(--text-3)]">
                      R{s.rank} · {SKILL_TYPE_LABEL[s.skill_type] ?? s.skill_type}
                    </span>
                    {s.skill_catalog?.animal_only && (
                      <span className="ml-1 text-[10px] text-[var(--text-4)]">· solo animal</span>
                    )}
                    {s.check_marks > 0 && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--gold-400)]">marcada</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSkill(s.id)}
                    className="shrink-0 rounded-lg p-1 text-[var(--text-4)] transition-colors hover:bg-white/10 hover:text-[var(--danger)]"
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {showSkillPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 overflow-hidden"
                >
                  <p className="mb-2 text-[10px] uppercase tracking-widest text-[var(--text-4)]">Catálogo</p>
                  <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                    {catalog.map((entry) => {
                      const owned = ownedSkillIds.has(entry.id);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={owned}
                          onClick={() => addSkillFromCatalog(entry)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all",
                            owned
                              ? "text-[var(--text-4)] opacity-50 cursor-not-allowed"
                              : "text-[var(--text-2)] hover:bg-white/8 cursor-pointer hover:text-[var(--text-1)]"
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <SkillThumb slug={entry.slug} skillType={defaultSkillType(entry)} thumbUrl={entry.thumb_url} size="xs" />
                            <span>
                              <span className="font-medium">{entry.name}</span>
                              <span className="ml-2 text-[var(--text-4)]">
                                d100 {skillRollLabel(entry.roll_min, entry.roll_max, entry.slug)}
                                {entry.animal_only ? " · animal" : ""}
                              </span>
                            </span>
                          </span>
                          {owned && <Check size={12} className="text-[var(--ok)]" />}
                        </button>
                      );
                    })}
                    {catalog.length === 0 && (
                      <p className="py-2 text-center text-xs text-[var(--text-4)]">
                        No hay catálogo de habilidades. Créalo en DM → Skills.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
