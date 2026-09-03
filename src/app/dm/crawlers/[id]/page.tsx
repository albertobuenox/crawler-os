"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { HealthBoxes, ResourceBar } from "@/components/hud/HealthBoxes";
import type { Crawler, Skill, Effect, SkillCatalogEntry, StatKey } from "@/lib/types";
import { STAT_LABELS } from "@/lib/types";
import { formatStat, statModifier } from "@/lib/rules";
import { SKILL_TYPE_LABEL } from "@/lib/copy";
import { defaultSkillType, skillRollLabel } from "@/lib/skills";
import { Minus, Plus, X, Skull, ShieldAlert, Flame, Droplets, Zap, Check } from "lucide-react";
import { cn } from "@/lib/utils";

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

/* ── Inline editable stat ── */
function EditableStat({
  statKey,
  value,
  neonClass,
  onChange,
}: {
  statKey: StatKey;
  value: number;
  neonClass: string;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const mod = statModifier(value);

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n >= 0 && n <= 99) onChange(n);
    setEditing(false);
  }

  if (editing) {
    return (
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={cn("well rounded-[14px] border p-2 text-center", neonClass)}
      >
        <div className="text-[8px] tracking-[0.16em] text-[var(--text-3)]">{STAT_LABELS[statKey]}</div>
        <input
          autoFocus
          type="number"
          min={0}
          max={99}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full bg-transparent text-center font-stat text-xl leading-none outline-none"
        />
        <div className="text-[10px] text-[var(--text-3)]">
          {mod >= 0 ? "+" : ""}{mod}
        </div>
      </motion.div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className={cn(
        "well rounded-[14px] border p-2 text-center cursor-pointer transition-all duration-200 hover:scale-105 hover:brightness-125",
        neonClass
      )}
      title={`Clic para editar ${STAT_LABELS[statKey]}`}
    >
      <div className="text-[8px] tracking-[0.16em] text-[var(--text-3)]">{STAT_LABELS[statKey]}</div>
      <div className="font-stat text-xl leading-none">{formatStat(value)}</div>
      <div className="text-[10px] text-[var(--text-3)]">
        {mod >= 0 ? "+" : ""}{mod}
      </div>
    </button>
  );
}

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
  const [saving, setSaving] = useState(false);
  const [showEffectPicker, setShowEffectPicker] = useState(false);
  const [showSkillPicker, setShowSkillPicker] = useState(false);
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([]);
  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: sk }, { data: ef }] = await Promise.all([
        supabase.from("crawlers").select("*").eq("id", id).single(),
        supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", id),
        supabase.from("effects").select("*").eq("crawler_id", id),
      ]);
      setCrawler(c as Crawler);
      setSkills((sk as Skill[]) ?? []);
      setEffects((ef as Effect[]) ?? []);
    })();
    supabase
      .from("skill_catalog")
      .select("*")
      .order("roll_min")
      .then(({ data }) => setCatalog((data as SkillCatalogEntry[]) ?? []));
  }, [id, supabase]);

  async function reloadSkills() {
    const { data } = await supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", id).order("created_at");
    setSkills((data as Skill[]) ?? []);
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

  function updateStat(key: StatKey, value: number) {
    if (!crawler) return;
    setCrawler({
      ...crawler,
      [`${key}_base`]: value,
      [`${key}_enhanced`]: value,
      ...(key === "int" ? { mana_max: value, mana_current: Math.min(crawler.mana_current, value) } : {}),
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
      rank: 0,
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
        <GlassPanel className="lg:col-span-2" title="Hoja de personaje">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" value={crawler.name} onChange={(e) => setCrawler({ ...crawler, name: e.target.value })} />
            <Input label="Nivel" type="number" value={crawler.level} onChange={(e) => setCrawler({ ...crawler, level: +e.target.value })} />
            <Input label="Raza" value={crawler.race ?? ""} onChange={(e) => setCrawler({ ...crawler, race: e.target.value })} />
            <Input
              label="Clase"
              placeholder="La adquiere más adelante"
              value={crawler.class_name ?? ""}
              onChange={(e) => setCrawler({ ...crawler, class_name: e.target.value || null })}
            />
          </div>

          {/* Stats — click to edit */}
          <div className="mt-6 grid grid-cols-5 gap-1.5">
            {STAT_KEYS.map((key, i) => (
              <EditableStat
                key={key}
                statKey={key}
                value={crawler[`${key}_enhanced`]}
                neonClass={STAT_NEON[i]}
                onChange={(v) => updateStat(key, v)}
              />
            ))}
          </div>

          {/* Health */}
          <div className="mt-6 space-y-4">
            <HealthBoxes
              boxesFilled={crawler.hp_boxes_filled}
              conEnhanced={crawler.con_enhanced}
              interactive
              onLifeChange={(life) => setCrawler({ ...crawler, hp_boxes_filled: 10 - life })}
            />
            <ResourceBar label="Maná" current={crawler.mana_current} max={crawler.mana_max} />
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
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-1)]">{s.name}</span>
                    <span className="ml-2 text-[var(--text-3)]">
                      R{s.rank} · {SKILL_TYPE_LABEL[s.skill_type] ?? s.skill_type}
                    </span>
                    {s.skill_catalog?.animal_only && (
                      <span className="ml-1 text-[10px] text-[var(--text-4)]">· solo animal</span>
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
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-all",
                            owned
                              ? "text-[var(--text-4)] opacity-50 cursor-not-allowed"
                              : "text-[var(--text-2)] hover:bg-white/8 cursor-pointer hover:text-[var(--text-1)]"
                          )}
                        >
                          <span>
                            <span className="font-medium">{entry.name}</span>
                            <span className="ml-2 text-[var(--text-4)]">
                              d100 {skillRollLabel(entry.roll_min, entry.roll_max)}
                              {entry.animal_only ? " · animal" : ""}
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
