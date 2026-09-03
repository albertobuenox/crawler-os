import type { DiceRollKind, StatKey } from "./types";

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

/** CarlRPG stat modifier: floor((stat - 10) / 2) */
export function statModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
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

/** Life boxes (0–10) → bar color: blue (full) → yellow → pink → red (critical) */
const HEALTH_COLOR_STOPS: { at: number; hex: string }[] = [
  { at: 10, hex: "#3b82f6" }, // blue (--mana)
  { at: 7, hex: "#22d3ee" },  // cyan transition
  { at: 5, hex: "#fbbf24" },  // yellow (--gold-400)
  { at: 3, hex: "#ec4899" },  // pink (--pink-500)
  { at: 1, hex: "#ff3b5c" },  // red (--hp)
  { at: 0, hex: "#ff3b5c" },
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
