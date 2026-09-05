import { SKILL_KIND_LABEL, SKILL_TYPE_LABEL } from "./copy";
import { skillArtSlug } from "./skill-art";
import { defaultSkillType, skillRollLabel } from "./skills";
import type { Skill, SkillCatalogEntry, SkillKind } from "./types";

export type SkillTipInfo = {
  name: string;
  description: string;
  typeLabel: string;
  kind?: SkillKind | null;
  skillType?: Skill["skill_type"] | null;
  rank?: number | null;
  rollLabel?: string | null;
  animalOnly?: boolean;
  slug?: string | null;
  thumbUrl?: string | null;
};

export function isAssignedSkill(value: Skill | SkillCatalogEntry): value is Skill {
  return "rank" in value && "skill_type" in value;
}

export function skillTypeLabel(skill: Pick<Skill, "skill_type"> & { skill_catalog?: Pick<SkillCatalogEntry, "kind"> | null }): string {
  const kind = skill.skill_catalog?.kind;
  if (kind) return SKILL_KIND_LABEL[kind] ?? kind;
  return SKILL_TYPE_LABEL[skill.skill_type] ?? skill.skill_type;
}

export function catalogTypeLabel(entry: Pick<SkillCatalogEntry, "kind" | "slug">): string {
  if (entry.kind) return SKILL_KIND_LABEL[entry.kind] ?? entry.kind;
  return SKILL_TYPE_LABEL[defaultSkillType(entry as SkillCatalogEntry)] ?? "Habilidad";
}

export function tipFromCatalog(entry: SkillCatalogEntry): SkillTipInfo {
  const roll = skillRollLabel(entry.roll_min, entry.roll_max, entry.slug);
  return {
    name: entry.name,
    description: entry.description?.trim() ?? "",
    typeLabel: catalogTypeLabel(entry),
    kind: entry.kind,
    skillType: defaultSkillType(entry),
    rollLabel: roll === "—" ? null : roll,
    animalOnly: entry.animal_only,
    slug: entry.slug,
    thumbUrl: entry.thumb_url,
  };
}

export function tipFromSkill(skill: Skill): SkillTipInfo {
  const cat = skill.skill_catalog;
  const roll = cat ? skillRollLabel(cat.roll_min, cat.roll_max, cat.slug) : null;
  return {
    name: skill.name,
    description: cat?.description?.trim() || skill.notes?.trim() || "",
    typeLabel: skillTypeLabel(skill),
    kind: cat?.kind,
    skillType: skill.skill_type,
    rank: skill.rank,
    rollLabel: roll && roll !== "—" ? roll : null,
    animalOnly: cat?.animal_only,
    slug: skillArtSlug(skill),
    thumbUrl: cat?.thumb_url,
  };
}

export function toSkillTip(source: Skill | SkillCatalogEntry): SkillTipInfo {
  return isAssignedSkill(source) ? tipFromSkill(source) : tipFromCatalog(source);
}
