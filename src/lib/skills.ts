import type { Skill, SkillCatalogEntry, SkillKind } from "./types";

export const SKILL_KINDS: SkillKind[] = ["ataque", "defensa", "apoyo", "destreza"];

export const SKILL_RANK_MIN = 1;
export const SKILL_RANK_MAX = 30;

export function clampSkillRank(rank: number): number {
  if (!Number.isFinite(rank)) return SKILL_RANK_MIN;
  return Math.min(SKILL_RANK_MAX, Math.max(SKILL_RANK_MIN, Math.trunc(rank)));
}

export function sortSkillsStable<T extends Pick<Skill, "id"> & { created_at?: string }>(skills: T[]): T[] {
  return [...skills].sort((a, b) => {
    const byDate = (a.created_at ?? "").localeCompare(b.created_at ?? "");
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

/** Slugs con icono de ataque en `public/skills/attack/<slug>.webp`. */
export const ATTACK_SKILL_SLUGS = new Set([
  "axe",
  "back-claw",
  "bite",
  "bow",
  "choke-out",
  "club",
  "crossbow",
  "dagger",
  "dirty-fighting",
  "foot-soldier",
  "handgun",
  "herding-weapons",
  "improvised-weapons",
  "iron-punch",
  "javelin",
  "lance",
  "longsword",
  "noggin-nocker",
  "polearm",
  "powerful-strike",
  "pugilism",
  "quarterstaff",
  "rapier",
  "shotgun",
  "shuriken",
  "skullcracker",
  "slice-attack",
  "slingshot",
  "smush",
  "toss",
  "unarmed-combat",
  "warhammer",
  "wrasslin",
]);

/** Skills de ataque fuera de la tabla d100 original (ROLL OR CHOOSE). */
export const OFF_TABLE_SKILL_SLUGS = new Set([
  "choke-out",
  "dirty-fighting",
  "herding-weapons",
  "iron-punch",
  "lance",
  "powerful-strike",
  "rapier",
  "skullcracker",
  "smush",
  "toss",
]);

export function skillRollLabel(min: number, max: number, slug?: string | null): string {
  if (min < 1 || (slug && OFF_TABLE_SKILL_SLUGS.has(slug))) return "—";
  return min === max ? String(min) : `${min}–${max}`;
}

export function pickSkillByRoll(
  catalog: SkillCatalogEntry[],
  roll: number
): SkillCatalogEntry | undefined {
  return catalog.find(
    (s) =>
      s.roll_min >= 1 &&
      !OFF_TABLE_SKILL_SLUGS.has(s.slug) &&
      roll >= s.roll_min &&
      roll <= s.roll_max
  );
}

export function defaultSkillType(entry: SkillCatalogEntry): Skill["skill_type"] {
  if (entry.slug === "regeneration") return "passive";
  if (entry.kind === "ataque" || ATTACK_SKILL_SLUGS.has(entry.slug)) return "attack";
  return "utility";
}

export function isSkillKind(value: unknown): value is SkillKind {
  return typeof value === "string" && SKILL_KINDS.includes(value as SkillKind);
}

export function catalogOptionLabel(entry: SkillCatalogEntry): string {
  const roll = skillRollLabel(entry.roll_min, entry.roll_max, entry.slug);
  const animal = entry.animal_only ? " · solo animal" : "";
  return `${roll} — ${entry.name}${animal}`;
}

export function skillSlugFromName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "skill";
}

export function isActiveSkill(skill: Pick<Skill, "skill_type">): boolean {
  return skill.skill_type !== "passive";
}

export function isSkillChecked(skill: Pick<Skill, "check_marks">): boolean {
  return skill.check_marks > 0;
}

export function catalogRangeOverlap(
  catalog: SkillCatalogEntry[],
  rollMin: number,
  rollMax: number,
  exceptId?: string
): SkillCatalogEntry | undefined {
  return catalog.find(
    (s) =>
      s.id !== exceptId &&
      !OFF_TABLE_SKILL_SLUGS.has(s.slug) &&
      s.roll_min <= rollMax &&
      s.roll_max >= rollMin
  );
}
