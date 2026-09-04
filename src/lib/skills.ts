import type { Skill, SkillCatalogEntry } from "./types";

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

export function skillRollLabel(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}

export function pickSkillByRoll(
  catalog: SkillCatalogEntry[],
  roll: number
): SkillCatalogEntry | undefined {
  return catalog.find((s) => roll >= s.roll_min && roll <= s.roll_max);
}

export function defaultSkillType(entry: SkillCatalogEntry): Skill["skill_type"] {
  if (entry.slug === "regeneration") return "passive";
  if (entry.page_ref <= 26 || entry.animal_only) return "attack";
  return "utility";
}

export function catalogOptionLabel(entry: SkillCatalogEntry): string {
  const roll = skillRollLabel(entry.roll_min, entry.roll_max);
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
    (s) => s.id !== exceptId && s.roll_min <= rollMax && s.roll_max >= rollMin
  );
}
