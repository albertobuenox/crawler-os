import type { Skill, SkillCatalogEntry } from "./types";

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
