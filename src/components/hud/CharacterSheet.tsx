"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, ScrollText, User, Shield } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { HealthBoxes, ResourceBar } from "@/components/hud/HealthBoxes";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { cn } from "@/lib/utils";
import { formatStat, statModifier } from "@/lib/rules";
import { crawlerClassLabel, SKILL_TYPE_LABEL, EFFECT_KIND_LABEL, BRAND } from "@/lib/copy";
import { skillRollLabel } from "@/lib/skills";
import type { Crawler, Skill, Effect, ItemInstance, Resource, StatKey } from "@/lib/types";
import { STAT_LABELS } from "@/lib/types";

type SheetTab = "stats" | "skills" | "background";

const TABS: { id: SheetTab; label: string; icon: typeof User; glow: string; color: string }[] = [
  { id: "stats", label: "Stats", icon: User, glow: "var(--glow-cyan)", color: "var(--cyan-400)" },
  { id: "skills", label: "Skills", icon: Sparkles, glow: "var(--glow-magenta)", color: "var(--magenta-400)" },
  { id: "background", label: "Transfondo", icon: ScrollText, glow: "var(--glow-gold)", color: "var(--gold-400)" },
];

const STAT_KEYS: StatKey[] = ["str", "int", "con", "dex", "cha"];
const STAT_NEON = [
  "text-[var(--cyan-400)] border-[var(--stroke-cyan)] shadow-[var(--glow-cyan)]",
  "text-[var(--magenta-400)] border-[var(--stroke-magenta)] shadow-[var(--glow-magenta)]",
  "text-[var(--gold-400)] border-[var(--stroke-reward)] shadow-[var(--glow-gold)]",
  "text-[var(--cyan-300)] border-[var(--stroke-cyan)] shadow-[var(--glow-cyan)]",
  "text-[var(--magenta-500)] border-[var(--stroke-magenta)] shadow-[var(--glow-magenta)]",
];

const LEFT_SLOTS = [
  { id: "head", label: "Cabeza" },
  { id: "cloak", label: "Capa" },
  { id: "chest", label: "Torso" },
  { id: "gloves", label: "Guantes" },
  { id: "boots", label: "Botas" },
] as const;

const RIGHT_SLOTS = [
  { id: "amulet", label: "Amuleto" },
  { id: "ring_1", label: "Anillo" },
  { id: "ring_2", label: "Anillo" },
] as const;

const WEAPON_SLOTS = [
  { id: "melee_main", label: "C. a cuerpo" },
  { id: "melee_off", label: "Off-hand" },
  { id: "ranged", label: "A distancia" },
] as const;

const INVENTORY_SLOTS = 12;

type SheetItem = ItemInstance & { resource: Resource };

function itemForSlot(items: SheetItem[], slot: string) {
  return items.find((i) => i.equipped_slot === slot) ?? null;
}

function loreText(value: unknown, empty: string) {
  if (value == null) return empty;
  if (typeof value === "string") return value.trim() || empty;
  if (Array.isArray(value)) return value.length ? value.map(String).join(", ") : empty;
  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    if (keys.length === 0) return empty;
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function StandingTemplate() {
  return (
    <svg viewBox="0 0 80 160" className="h-full w-full" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="40" cy="18" r="12" />
        <path d="M40 30 V78" />
        <path d="M40 42 L18 70" />
        <path d="M40 42 L62 70" />
        <path d="M40 78 L22 148" />
        <path d="M40 78 L58 148" />
      </g>
    </svg>
  );
}

export function CharacterSheet({
  crawler,
  skills,
  effects,
  items,
}: {
  crawler: Crawler;
  skills: Skill[];
  effects: Effect[];
  items: SheetItem[];
}) {
  const [tab, setTab] = useState<SheetTab>("stats");
  const bag = items.filter((i) => !i.equipped_slot);
  const bagSlots = Math.max(INVENTORY_SLOTS, Math.ceil(bag.length / 4) * 4);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
      <GlassPanel variant="identity" className="lg:col-span-4" title={crawler.name} subtitle={`${crawler.race ?? "—"} · ${crawlerClassLabel(crawler.class_name)} · LV ${crawler.level}`}>
        <div className="mb-4 flex gap-1">
          {TABS.map(({ id, label, icon: Icon, glow, color }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-label={label}
                aria-pressed={active}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[10px] font-medium uppercase tracking-[0.14em] transition-all duration-[var(--t-ui)]",
                  active
                    ? "well text-[var(--text-1)]"
                    : "text-[var(--text-3)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-1)]"
                )}
                style={active ? { boxShadow: glow, color } : undefined}
              >
                <Icon size={14} strokeWidth={1.75} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {tab === "stats" && <StatsTab crawler={crawler} effects={effects} />}
            {tab === "skills" && <SkillsTab crawler={crawler} skills={skills} />}
            {tab === "background" && <BackgroundTab crawler={crawler} />}
          </motion.div>
        </AnimatePresence>
      </GlassPanel>

      <GlassPanel className="lg:col-span-4" title="Equipamiento" subtitle="Plantilla de zonas — se afinará después">
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-start gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem]">
          <div className="flex flex-col gap-2">
            {LEFT_SLOTS.map((slot) => (
              <EquipCell key={slot.id} slot={slot} item={itemForSlot(items, slot.id)} />
            ))}
          </div>
          <div className="relative mx-auto flex aspect-[1/2] max-h-[340px] w-full max-w-[160px] items-center justify-center text-[var(--magenta-500)] opacity-40">
            <StandingTemplate />
          </div>
          <div className="flex flex-col gap-2">
            {RIGHT_SLOTS.map((slot) => (
              <EquipCell key={slot.id} slot={slot} item={itemForSlot(items, slot.id)} />
            ))}
            <div className="mt-auto flex flex-col items-center gap-0.5 rounded-[12px] border border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.08)] px-1 py-2 text-center">
              <Shield size={14} className="text-[var(--magenta-400)]" />
              <span className="text-[8px] uppercase tracking-wider text-[var(--text-3)]">DR</span>
              <span className="font-stat text-sm text-[var(--magenta-400)]">{crawler.dr_total}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {WEAPON_SLOTS.map((slot) => (
            <EquipCell key={slot.id} slot={slot} item={itemForSlot(items, slot.id)} wide />
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="lg:col-span-4" title="Inventario" subtitle="Pasa el cursor para inspeccionar">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: bagSlots }, (_, i) => {
            const item = bag[i];
            if (!item) {
              return <InventorySlot key={`empty-${i}`} empty size="lg" />;
            }
            return (
              <InventorySlot
                key={item.id}
                name={item.resource.name}
                rarity={item.resource.rarity}
                quantity={item.quantity}
                iconUrl={item.resource.icon_url}
                detail={item.resource.system_copy ?? item.resource.description ?? undefined}
                size="lg"
                showTooltip
              />
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
}

function EquipCell({
  slot,
  item,
  wide,
}: {
  slot: { id: string; label: string };
  item: SheetItem | null;
  wide?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1", wide && "min-w-0")}>
      <InventorySlot
        name={item?.resource.name}
        rarity={item?.resource.rarity}
        iconUrl={item?.resource.icon_url}
        detail={item ? (item.resource.system_copy ?? item.resource.description ?? undefined) : undefined}
        empty={!item}
        size="lg"
        showTooltip={!!item}
        equipped={!!item}
      />
      <span className="text-[8px] uppercase tracking-[0.14em] text-[var(--text-4)]">{slot.label}</span>
    </div>
  );
}

function StatsTab({ crawler, effects }: { crawler: Crawler; effects: Effect[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-1.5">
        {STAT_KEYS.map((key, i) => {
          const value = crawler[`${key}_enhanced`];
          const mod = statModifier(value);
          return (
            <div key={key} className={cn("well rounded-[14px] border p-2 text-center", STAT_NEON[i])}>
              <div className="text-[8px] tracking-[0.16em] text-[var(--text-3)]">{STAT_LABELS[key]}</div>
              <div className="font-stat text-xl leading-none">{formatStat(value)}</div>
              <div className="text-[10px] text-[var(--text-3)]">
                {mod >= 0 ? "+" : ""}
                {mod}
              </div>
            </div>
          );
        })}
      </div>
      <HealthBoxes boxesFilled={crawler.hp_boxes_filled} conEnhanced={crawler.con_enhanced} />
      <ResourceBar label="Maná" current={crawler.mana_current} max={crawler.mana_max} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Evadir" value={crawler.evade_total} />
        <MiniStat label="Move" value={crawler.move} />
        <MiniStat label="Step" value={crawler.step} />
      </div>
      <p className="text-xs text-[var(--gold-400)]">Favor del Sistema: {crawler.ai_favor_remaining} restante</p>
      <div>
        <p className="text-label mb-2">Efectos activos</p>
        {effects.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">Ninguno</p>
        ) : (
          effects.map((e) => (
            <div key={e.id} className="well mb-1 px-2 py-1 text-sm capitalize">
              {e.name}
              <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                {EFFECT_KIND_LABEL[e.effect_kind] ?? e.effect_kind}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="well px-2 py-2">
      <div className="text-label">{label}</div>
      <div className="font-stat text-lg text-[var(--cyan-400)]">{value}</div>
    </div>
  );
}

function SkillsTab({ crawler, skills }: { crawler: Crawler; skills: Skill[] }) {
  if (skills.length === 0) {
    return <p className="text-sm text-[var(--text-3)]">Aún no hay habilidades.</p>;
  }
  return (
    <ul className="space-y-2">
      {skills.map((s) => (
        <li key={s.id} className="well px-3 py-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-[var(--text-1)]">{s.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--magenta-400)]">
                {SKILL_TYPE_LABEL[s.skill_type] ?? s.skill_type}
                {s.skill_catalog?.animal_only ? " · solo animal" : ""}
              </p>
            </div>
            <span className="font-stat text-[var(--gold-400)]">R{s.rank}</span>
          </div>
          <p className="mt-1 text-xs text-[var(--text-3)]">
            {s.linked_stat.toUpperCase()} {statModifier(crawler[`${s.linked_stat}_enhanced`]) >= 0 ? "+" : ""}
            {statModifier(crawler[`${s.linked_stat}_enhanced`])}
            {s.skill_catalog && ` · d100 ${skillRollLabel(s.skill_catalog.roll_min, s.skill_catalog.roll_max)}`}
          </p>
        </li>
      ))}
    </ul>
  );
}

function BackgroundTab({ crawler }: { crawler: Crawler }) {
  const rows: { label: string; value: string }[] = [
    { label: "Deidad", value: loreText(crawler.deity, "Ninguna") },
    { label: "Trauma pasado", value: loreText(crawler.past_trauma, "El dungeon aún no ha abierto esa herida.") },
    { label: "Popularidad", value: loreText(crawler.popularity, "Anónimo. Por ahora.") },
    { label: "Cabos sueltos", value: loreText(crawler.loose_ends, "Ninguno registrado") },
    { label: "Arrepentimientos", value: loreText(crawler.regrets, `Ninguno que ${BRAND} quiera imprimir`) },
    { label: "Notas", value: loreText(crawler.notes, "Vacío") },
    { label: "Habilidades raciales", value: loreText(crawler.racial_abilities, "Ninguna") },
    { label: "Habilidades de clase", value: loreText(crawler.class_abilities, "Ninguna") },
    { label: "Mascota", value: loreText(crawler.pet, "Sin mascota") },
    { label: "Patrocinadores", value: loreText(crawler.sponsors, "Ninguno") },
    { label: "Espacio personal", value: loreText(crawler.personal_space, "Vacío") },
  ];

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.label}>
          <p className="text-label mb-1">{row.label}</p>
          <p className="whitespace-pre-wrap text-sm text-[var(--text-2)]">{row.value}</p>
        </div>
      ))}
    </div>
  );
}
