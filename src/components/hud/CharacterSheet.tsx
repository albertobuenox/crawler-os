"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, User, Shield, WandSparkles } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { HealthBoxes, ResourceBar, useVitalPulse } from "@/components/hud/HealthBoxes";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { InventoryBagGrid } from "@/components/hud/InventoryBagGrid";
import { CrawlerCraftModal } from "@/components/hud/CrawlerCraftModal";
import { cn } from "@/lib/utils";
import { crawlerFullBodyUrl } from "@/lib/crawler-art";
import { collectStatBonusChips, healthBarColor } from "@/lib/rules";
import { crawlerClassLabel, EFFECT_KIND_LABEL } from "@/lib/copy";
import { resourceThumbUrl } from "@/lib/item-art";
import { resourceBlurb } from "@/lib/resources";
import { slotFromResource } from "@/lib/loot";
import { SkillListItem } from "@/components/hud/SkillListItem";
import { SpellListItem } from "@/components/hud/SpellListItem";
import { sortSkillsStable } from "@/lib/skills";
import { sortSpellsStable } from "@/lib/spells";
import {
  ACCESSORY_SLOTS,
  BODY_SLOTS,
  HAND_SLOTS,
  bonusLines,
  readItemDrag,
  resourceEquipSlot,
  slotAccepts,
  writeItemDrag,
} from "@/lib/equipment";
import type { Crawler, Skill, Spell, Effect, ItemInstance, Resource, StatKey, StatModifierRow } from "@/lib/types";
import { StatBlock } from "@/components/hud/StatBlock";

type SheetTab = "stats" | "skills" | "spells";

const TABS: { id: SheetTab; label: string; icon: typeof User; glow: string; color: string }[] = [
  { id: "stats", label: "Stats", icon: User, glow: "var(--glow-cyan)", color: "var(--cyan-400)" },
  { id: "skills", label: "Skills", icon: Sparkles, glow: "var(--glow-magenta)", color: "var(--magenta-400)" },
  { id: "spells", label: "Spells", icon: WandSparkles, glow: "var(--glow-gold)", color: "var(--gold-400)" },
];

const STAT_KEYS: StatKey[] = ["str", "int", "con", "dex", "cha"];
const STAT_NEON = [
  "text-[var(--cyan-400)] border-[var(--stroke-cyan)] shadow-[var(--glow-cyan)]",
  "text-[var(--magenta-400)] border-[var(--stroke-magenta)] shadow-[var(--glow-magenta)]",
  "text-[var(--gold-400)] border-[var(--stroke-reward)] shadow-[var(--glow-gold)]",
  "text-[var(--cyan-300)] border-[var(--stroke-cyan)] shadow-[var(--glow-cyan)]",
  "text-[var(--magenta-500)] border-[var(--stroke-magenta)] shadow-[var(--glow-magenta)]",
];

type SheetItem = ItemInstance & { resource: Resource };

function itemForSlot(items: SheetItem[], slot: string) {
  return items.find((i) => i.equipped_slot === slot) ?? null;
}

function StandingTemplate() {
  return (
    <svg viewBox="0 0 80 160" className="h-full w-full p-3" aria-hidden="true">
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

function FullBodyFrame({ name }: { name: string }) {
  const src = crawlerFullBodyUrl(name);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showArt = Boolean(src && !failed);

  return (
    <div
      className={cn(
        "relative mx-auto flex aspect-[9/16] max-h-[360px] w-full max-w-[180px] items-center justify-center overflow-hidden rounded-[16px] border lg:max-h-[560px] lg:max-w-[300px] xl:max-h-[720px] xl:max-w-[420px]",
        showArt
          ? "border-[var(--stroke-magenta)] bg-[rgba(8,10,18,0.88)] shadow-[var(--glow-magenta)]"
          : "border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.05)] text-[var(--magenta-500)]"
      )}
    >
      {showArt ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={`${name}, cuerpo entero`}
          className="h-full w-full object-contain object-center"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center opacity-40">
          <StandingTemplate />
        </div>
      )}
    </div>
  );
}

export function CharacterSheet({
  crawler,
  skills,
  spells = [],
  effects,
  items,
  modifiers = [],
  canEditSkills = false,
  canEditSpells = false,
  canEditVitals = false,
  canViewInventory = true,
  canEquip = false,
  advancementOpen = false,
  onToggleSkillCheck,
  onAdjustSkillRank,
  onToggleSpellCheck,
  onAdjustSpellRank,
  onLifeChange,
  onManaChange,
  onEquip,
  onUnequip,
  onCrafted,
}: {
  crawler: Crawler;
  skills: Skill[];
  spells?: Spell[];
  effects: Effect[];
  items: SheetItem[];
  modifiers?: StatModifierRow[];
  canEditSkills?: boolean;
  canEditSpells?: boolean;
  canEditVitals?: boolean;
  canViewInventory?: boolean;
  canEquip?: boolean;
  advancementOpen?: boolean;
  onToggleSkillCheck?: (skill: Skill, checked: boolean) => void;
  onAdjustSkillRank?: (skill: Skill, delta: -1 | 1) => void;
  onToggleSpellCheck?: (spell: Spell, checked: boolean) => void;
  onAdjustSpellRank?: (spell: Spell, delta: -1 | 1) => void;
  onLifeChange?: (lifeBoxes: number) => void;
  onManaChange?: (manaCurrent: number) => void;
  onEquip?: (itemId: string, slot?: string) => void;
  onUnequip?: (itemId: string) => void;
  onCrafted?: () => void;
}) {
  const [tab, setTab] = useState<SheetTab>("stats");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [crafting, setCrafting] = useState(false);
  const { pulse, beat } = useVitalPulse();
  const bag = items.filter((i) => !i.equipped_slot);
  const canCraft = canEquip && canViewInventory;
  const dragging = items.find((item) => item.id === draggingId) ?? null;
  const draggingSlot = dragging ? resourceEquipSlot(dragging.resource) : null;

  function handleLifeChange(life: number) {
    beat(healthBarColor(life));
    onLifeChange?.(life);
  }

  return (
    <>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-start">
      <GlassPanel
        variant="identity"
        className="!overflow-visible lg:col-span-4 xl:col-span-3"
        title={crawler.name}
        subtitle={`${crawler.race ?? "—"} · ${crawlerClassLabel(crawler.class_name)} · LV ${crawler.level}`}
        pulseKey={pulse.key}
        pulseColor={pulse.color}
      >
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
            {tab === "stats" && (
              <StatsTab
                crawler={crawler}
                effects={effects}
                items={items}
                modifiers={modifiers}
                canEditVitals={canEditVitals}
                onLifeChange={handleLifeChange}
                onManaChange={onManaChange}
              />
            )}
            {tab === "skills" && (
              <SkillsTab
                crawler={crawler}
                skills={skills}
                canEditSkills={canEditSkills}
                advancementOpen={advancementOpen}
                onToggleSkillCheck={onToggleSkillCheck}
                onAdjustSkillRank={onAdjustSkillRank}
              />
            )}
            {tab === "spells" && (
              <SpellsTab
                crawler={crawler}
                spells={spells}
                canEditSpells={canEditSpells}
                advancementOpen={advancementOpen}
                onToggleSpellCheck={onToggleSpellCheck}
                onAdjustSpellRank={onAdjustSpellRank}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </GlassPanel>

      <GlassPanel className="lg:col-span-5 xl:col-span-6" title="Equipamiento" subtitle="Cuerpo entero y zonas de equipo">
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-start gap-2 sm:grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] lg:grid-cols-[5rem_minmax(0,1fr)_5rem]">
          <div className="flex flex-col gap-2">
            {BODY_SLOTS.map((slot) => (
              <EquipCell
                key={slot.id}
                slot={slot}
                item={itemForSlot(items, slot.id)}
                canEquip={canEquip}
                highlighted={slotAccepts(slot.id, draggingSlot)}
                onDragItem={setDraggingId}
                onEquip={onEquip}
                onUnequip={onUnequip}
              />
            ))}
          </div>
          <FullBodyFrame name={crawler.name} />
          <div className="flex flex-col gap-2">
            {HAND_SLOTS.map((slot) => (
              <EquipCell
                key={slot.id}
                slot={slot}
                item={itemForSlot(items, slot.id)}
                canEquip={canEquip}
                highlighted={slotAccepts(slot.id, draggingSlot)}
                onDragItem={setDraggingId}
                onEquip={onEquip}
                onUnequip={onUnequip}
              />
            ))}
            <div className="mt-auto flex flex-col items-center gap-0.5 rounded-[12px] border border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.08)] px-1 py-2 text-center">
              <Shield size={14} className="text-[var(--magenta-400)]" />
              <span className="text-[8px] uppercase tracking-wider text-[var(--text-3)]">DR</span>
              <span className="font-stat text-sm text-[var(--magenta-400)]">{crawler.dr_total}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {ACCESSORY_SLOTS.map((slot) => (
            <EquipCell
              key={slot.id}
              slot={slot}
              item={itemForSlot(items, slot.id)}
              compact
              canEquip={canEquip}
              highlighted={slotAccepts(slot.id, draggingSlot)}
              onDragItem={setDraggingId}
              onEquip={onEquip}
              onUnequip={onUnequip}
            />
          ))}
        </div>
      </GlassPanel>

      <GlassPanel
        className="lg:col-span-3"
        title="Inventario"
        subtitle={canViewInventory ? (canEquip ? "Doble clic o arrastra al slot" : "Pasa el cursor para inspeccionar") : undefined}
      >
        <div
          className="relative min-h-[12rem]"
          onDragOver={(event) => {
            if (!canEquip || !dragging?.equipped_slot) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!canEquip) return;
            const id = readItemDrag(event);
            const item = items.find((entry) => entry.id === id);
            setDraggingId(null);
            if (item?.equipped_slot) onUnequip?.(item.id);
          }}
        >
          <div
            className={cn(!canViewInventory && "pointer-events-none select-none blur-xl")}
            aria-hidden={!canViewInventory}
          >
            <InventoryBagGrid
              items={bag}
              canCraft={canCraft}
              canEquip={canEquip}
              draggingId={draggingId}
              onCraft={() => setCrafting(true)}
              onEquip={(item) => onEquip?.(item.id)}
              onDragStart={(event, item) => {
                writeItemDrag(event, item.id);
                setDraggingId(item.id);
              }}
              onDragEnd={() => setDraggingId(null)}
            />
          </div>
          {!canViewInventory && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[rgba(5,6,13,0.45)] px-4">
              <p className="max-w-[16rem] text-center font-display text-sm font-bold leading-snug tracking-[0.04em] text-[var(--text-1)]">
                No seas stalker, si quieres saber qué tiene este jugador pregúntale
              </p>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
    <CrawlerCraftModal
      open={crafting}
      sessionId={crawler.session_id}
      onClose={() => setCrafting(false)}
      onCreated={() => {
        setCrafting(false);
        onCrafted?.();
      }}
    />
    </>
  );
}

function EquipCell({
  slot,
  item,
  compact,
  canEquip,
  highlighted,
  onDragItem,
  onEquip,
  onUnequip,
}: {
  slot: { id: string; label: string };
  item: SheetItem | null;
  compact?: boolean;
  canEquip?: boolean;
  highlighted?: boolean;
  onDragItem?: (id: string | null) => void;
  onEquip?: (itemId: string, slot?: string) => void;
  onUnequip?: (itemId: string) => void;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1", compact ? "w-12 sm:w-14" : "min-w-0")}>
      <InventorySlot
        name={item?.resource.name}
        rarity={item?.resource.rarity}
        iconUrl={item ? resourceThumbUrl(item.resource) : null}
        detail={item ? resourceBlurb(item.resource) : undefined}
        bonuses={item ? bonusLines(item.resource) : undefined}
        empty={!item}
        highlighted={highlighted}
        size={compact ? "sm" : "lg"}
        showTooltip={!!item && !highlighted}
        equipped={!!item}
        draggable={canEquip && !!item}
        onDoubleClick={
          canEquip && item
            ? () => onUnequip?.(item.id)
            : undefined
        }
        onDragStart={
          item
            ? (event) => {
                writeItemDrag(event, item.id);
                onDragItem?.(item.id);
              }
            : undefined
        }
        onDragEnd={() => onDragItem?.(null)}
        onDragOver={
          canEquip && highlighted
            ? (event) => {
                event.preventDefault();
              }
            : undefined
        }
        onDrop={
          canEquip && highlighted
            ? (event) => {
                event.preventDefault();
                const id = readItemDrag(event);
                onDragItem?.(null);
                if (!id) return;
                onEquip?.(id, slot.id);
              }
            : undefined
        }
        {...(item ? slotFromResource(item.resource) : {})}
      />
      <span className="text-center text-[8px] uppercase tracking-[0.14em] text-[var(--text-4)]">{slot.label}</span>
    </div>
  );
}

function StatsTab({
  crawler,
  effects,
  items,
  modifiers,
  canEditVitals,
  onLifeChange,
  onManaChange,
}: {
  crawler: Crawler;
  effects: Effect[];
  items: SheetItem[];
  modifiers: StatModifierRow[];
  canEditVitals?: boolean;
  onLifeChange?: (lifeBoxes: number) => void;
  onManaChange?: (manaCurrent: number) => void;
}) {
  const named = [
    ...effects.map((e) => ({ id: e.id, name: e.name })),
    ...items.map((i) => ({ id: i.resource.id, name: i.resource.name })),
    ...items.map((i) => ({ id: i.id, name: i.resource.name })),
  ];
  const equipped = items.filter((i) => i.equipped_slot);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-1.5 overflow-visible">
        {STAT_KEYS.map((key, i) => (
          <StatBlock
            key={key}
            statKey={key}
            base={crawler[`${key}_base`]}
            enhanced={crawler[`${key}_enhanced`]}
            bonuses={collectStatBonusChips(key, modifiers, named, equipped)}
            neonClass={STAT_NEON[i]}
          />
        ))}
      </div>
      <HealthBoxes
        boxesFilled={crawler.hp_boxes_filled}
        conEnhanced={crawler.con_enhanced}
        interactive={canEditVitals}
        onLifeChange={onLifeChange}
      />
      <ResourceBar
        label="Maná"
        current={crawler.mana_current}
        max={crawler.mana_max}
        interactive={canEditVitals}
        onCurrentChange={onManaChange}
      />
      {/* 
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat label="Evadir" value={crawler.evade_total} />
        <MiniStat label="Move" value={crawler.move} />
        <MiniStat label="Step" value={crawler.step} />
      </div>
      */}
 
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-3)]">Favor de la IA:</span>
        <span className="font-stat text-lg text-[var(--gold-400)]">{crawler.ai_favor_remaining}</span>
        <span className="text-xs text-[var(--text-3)]">restante</span>
      </div>
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

function SkillsTab({
  crawler,
  skills,
  canEditSkills,
  advancementOpen,
  onToggleSkillCheck,
  onAdjustSkillRank,
}: {
  crawler: Crawler;
  skills: Skill[];
  canEditSkills: boolean;
  advancementOpen: boolean;
  onToggleSkillCheck?: (skill: Skill, checked: boolean) => void;
  onAdjustSkillRank?: (skill: Skill, delta: -1 | 1) => void;
}) {
  if (skills.length === 0) {
    return <p className="text-sm text-[var(--text-3)]">Aún no hay habilidades.</p>;
  }
  return (
    <div className="space-y-2">
      {advancementOpen && canEditSkills && (
        <p className="rounded-lg border border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] px-3 py-2 text-[11px] text-[var(--cyan-400)]">
          Subida abierta. Ajusta el rango de las skills que hayas marcado.
        </p>
      )}
      <ul className="space-y-2">
        {sortSkillsStable(skills).map((s) => (
          <SkillListItem
            key={s.id}
            crawler={crawler}
            skill={s}
            canCheck={canEditSkills && !advancementOpen}
            canAdjustRank={canEditSkills && advancementOpen && s.check_marks > 0 && s.skill_type !== "passive"}
            onToggleCheck={onToggleSkillCheck}
            onAdjustRank={onAdjustSkillRank}
          />
        ))}
      </ul>
    </div>
  );
}

function SpellsTab({
  crawler,
  spells,
  canEditSpells,
  advancementOpen,
  onToggleSpellCheck,
  onAdjustSpellRank,
}: {
  crawler: Crawler;
  spells: Spell[];
  canEditSpells: boolean;
  advancementOpen: boolean;
  onToggleSpellCheck?: (spell: Spell, checked: boolean) => void;
  onAdjustSpellRank?: (spell: Spell, delta: -1 | 1) => void;
}) {
  if (spells.length === 0) {
    return <p className="text-sm text-[var(--text-3)]">Aún no hay conjuros.</p>;
  }
  return (
    <div className="space-y-2">
      {advancementOpen && canEditSpells && (
        <p className="rounded-lg border border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] px-3 py-2 text-[11px] text-[var(--cyan-400)]">
          Subida abierta. Ajusta el rango de los spells que hayas marcado.
        </p>
      )}
      <ul className="space-y-2">
        {sortSpellsStable(spells).map((s) => (
          <SpellListItem
            key={s.id}
            crawler={crawler}
            spell={s}
            canCheck={canEditSpells && !advancementOpen}
            canAdjustRank={canEditSpells && advancementOpen && s.check_marks > 0}
            onToggleCheck={onToggleSpellCheck}
            onAdjustRank={onAdjustSpellRank}
          />
        ))}
      </ul>
    </div>
  );
}
