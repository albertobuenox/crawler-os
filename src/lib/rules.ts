import type { DiceRollKind, StatKey } from "./types";

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

export function rollD20(advantage = false, disadvantage = false): { rolls: number[]; result: number } {
  const d1 = Math.floor(Math.random() * 20) + 1;
  if (!advantage && !disadvantage) return { rolls: [d1], result: d1 };
  const d2 = Math.floor(Math.random() * 20) + 1;
  if (advantage) return { rolls: [d1, d2], result: Math.max(d1, d2) };
  return { rolls: [d1, d2], result: Math.min(d1, d2) };
}

export const COMBAT_PHASES = [
  { key: "combat_1", label: "Phase 1 — Mob Declaration" },
  { key: "combat_2", label: "Phase 2 — Crawler Reactions" },
  { key: "combat_3", label: "Phase 3 — Mob Resolution" },
  { key: "combat_4", label: "Phase 4 — Crawler Attacks" },
  { key: "combat_5", label: "Phase 5 — Cleanup" },
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
