import type { DiceRollKind, StatKey } from "./types";
import { STAT_LABELS } from "./types";

export const STAT_KEYS = ["str", "int", "con", "dex", "cha"] as const;

/** Starting array: assign each value once. Stats go up later. */
export const STARTING_STAT_VALUES = [2, 3, 4, 5, 6] as const;

export function formatStat(value: number): string {
  return String(value).padStart(2, "0");
}

/** If `next` is already on another stat, swap so the array stays unique. */
export function assignStartingStat<T extends Record<`${StatKey}_base`, number>>(
  stats: T,
  key: StatKey,
  next: number
): T {
  const field = `${key}_base` as const;
  const previous = stats[field];
  const takenBy = STAT_KEYS.find((k) => k !== key && stats[`${k}_base`] === next);
  const updated = { ...stats, [field]: next };
  if (takenBy) updated[`${takenBy}_base`] = previous;
  return updated;
}

export function formatSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

export function enhancedStatLabel(stat: StatKey): string {
  return `${STAT_LABELS[stat]}+`;
}

/**
 * Modifier from enhanced stat.
 * +1 → 1–2, +2 → 3–5, +3 → 6–9, +4 → 10–14, +5 → 15–20, then the range grows by 1 each step.
 */
export function statModifier(enhanced: number): number {
  if (!Number.isFinite(enhanced) || enhanced <= 0) return 0;
  return Math.ceil((-3 + Math.sqrt(9 + 8 * enhanced)) / 2);
}

export type StatBonusChip = { name: string; value: number };

export function payloadStatBonus(
  payload: Record<string, unknown> | null | undefined,
  stat: StatKey
): number {
  if (!payload) return 0;
  const bag = payload.stats ?? payload.stat_bonuses;
  if (bag && typeof bag === "object" && !Array.isArray(bag)) {
    const v = (bag as Record<string, unknown>)[stat];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  const bonuses = payload.bonuses;
  if (!Array.isArray(bonuses)) return 0;
  return bonuses.reduce((sum, entry) => {
    if (!entry || typeof entry !== "object") return sum;
    const rec = entry as Record<string, unknown>;
    if (rec.stat === stat && typeof rec.value === "number") return sum + rec.value;
    return sum;
  }, 0);
}

export type StatModifierSource = {
  source_type: string;
  source_id: string | null;
  target_field: string;
  value: number;
};

function sourceTypeLabel(type: string) {
  if (type === "item" || type === "equipment") return "Equipo";
  if (type === "effect" || type === "magic" || type === "spell") return "Magia";
  return type.trim() || "Bonificación";
}

export function collectStatBonusChips(
  stat: StatKey,
  sources: StatModifierSource[],
  named: { id: string; name: string }[],
  equippedItems: { id: string; resource: { id: string; name: string; payload: Record<string, unknown> } }[] = []
): StatBonusChip[] {
  const fromRows = sources
    .filter((s) => s.target_field === stat && s.value !== 0)
    .map((s) => ({
      name:
        named.find((n) => n.id === s.source_id)?.name ??
        equippedItems.find((i) => i.id === s.source_id || i.resource.id === s.source_id)?.resource.name ??
        sourceTypeLabel(s.source_type),
      value: s.value,
    }));
  if (fromRows.length > 0) return fromRows;

  return equippedItems.flatMap((item) => {
    const value = payloadStatBonus(item.resource.payload, stat);
    return value ? [{ name: item.resource.name, value }] : [];
  });
}

export function computeDc(
  kind: DiceRollKind,
  floorNumber: number,
  antagonistMod = 0
): number {
  switch (kind) {
    case "opposed":
      return 10 + antagonistMod + floorNumber;
    case "unopposed":
      return 10 + floorNumber * 2;
    case "stat_check":
    case "attack":
    case "scaled":
    default:
      return 10 + floorNumber;
  }
}

export function attackDefense(dexMod: number, floorNumber: number, extra = 0): number {
  return 10 + dexMod + floorNumber + extra;
}

export function getEnhancedStat(crawler: Record<StatKey | `${StatKey}_enhanced`, number>, stat: StatKey): number {
  return crawler[`${stat}_enhanced`] as number;
}

export function healthBoxValue(conEnhanced: number): number {
  return Math.max(statModifier(conEnhanced), 1);
}

export function healthPercent(boxesFilled: number): number {
  return ((10 - boxesFilled) / 10) * 100;
}

export function clampLifeBoxes(n: number): number {
  return Math.min(10, Math.max(0, Math.round(n)));
}

export function lifeToBoxesFilled(lifeBoxes: number): number {
  return 10 - clampLifeBoxes(lifeBoxes);
}

/** Resolved hex — never append alpha to `var(--mana)` (invalid CSS, bar stays empty). */
export const MANA_BAR_COLOR = "#3b82f6";

export function manaPercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(Math.max((current / max) * 100, 0), 100);
}

export function clampMana(current: number, max: number): number {
  const cap = Math.max(0, max);
  return Math.min(cap, Math.max(0, Math.round(Number.isFinite(current) ? current : 0)));
}

/** Life boxes (0–10) → bar color: green (full) → olive → gold → orange → red (critical) */
const HEALTH_COLOR_STOPS: { at: number; hex: string }[] = [
  { at: 10, hex: "#1faa3a" }, // 100% deep vibrant green
  { at: 9, hex: "#34c043" },  // 90%
  { at: 8, hex: "#4caf36" },  // 80% leafy green
  { at: 7, hex: "#73c22e" },  // 70%
  { at: 6, hex: "#a4c639" },  // 60% lime olive
  { at: 5, hex: "#c6c02e" },  // 50% yellow-olive
  { at: 4, hex: "#e8a317" },  // 40% golden yellow-orange
  { at: 3, hex: "#f07812" },  // 30% orange
  { at: 2, hex: "#f04e12" },  // 20% reddish-orange
  { at: 1, hex: "#ff3d00" },  // 10% vibrant red-orange
  { at: 0, hex: "#c41818" },
];

function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) =>
    [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(mix(r1, r2))}${toHex(mix(g1, g2))}${toHex(mix(b1, b2))}`;
}

export function healthBarColor(lifeBoxes: number): string {
  const clamped = Math.min(Math.max(lifeBoxes, 0), 10);
  for (let i = 0; i < HEALTH_COLOR_STOPS.length - 1; i++) {
    const hi = HEALTH_COLOR_STOPS[i];
    const lo = HEALTH_COLOR_STOPS[i + 1];
    if (clamped >= lo.at) {
      const range = hi.at - lo.at || 1;
      const t = (clamped - lo.at) / range;
      return lerpHex(lo.hex, hi.hex, t);
    }
  }
  return HEALTH_COLOR_STOPS[HEALTH_COLOR_STOPS.length - 1].hex;
}

export function rollD20(advantage = false, disadvantage = false): { rolls: number[]; result: number } {
  const d1 = Math.floor(Math.random() * 20) + 1;
  if (!advantage && !disadvantage) return { rolls: [d1], result: d1 };
  const d2 = Math.floor(Math.random() * 20) + 1;
  if (advantage) return { rolls: [d1, d2], result: Math.max(d1, d2) };
  return { rolls: [d1, d2], result: Math.min(d1, d2) };
}

export const COMBAT_PHASES = [
  { key: "combat_1", label: "Fase 1 — Declaración de mobs" },
  { key: "combat_2", label: "Fase 2 — Reacciones de crawlers" },
  { key: "combat_3", label: "Fase 3 — Resolución de mobs" },
  { key: "combat_4", label: "Fase 4 — Ataques de crawlers" },
  { key: "combat_5", label: "Fase 5 — Limpieza" },
] as const;

export const GEAR_SLOTS = [
  "head",
  "torso",
  "arms",
  "hands",
  "legs",
  "feet",
  "accessory",
] as const;

export const DAMAGE_TYPES = [
  "acid",
  "necrotic",
  "electric",
  "fire",
  "ice",
  "sonic",
  "holy",
  "slashing",
  "bludgeoning",
  "psychic",
  "force",
  "poison",
  "piercing",
] as const;
