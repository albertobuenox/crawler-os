/**
 * Ilustraciones locales en `public/skills/<slug>.webp`.
 * El slug es el del catálogo (aiming, animal-handling, wrasslin…).
 * Si el archivo aún no está, la UI muestra un recuadro vacío.
 */

import { skillSlugFromName } from "./skills";
import type { Skill, SkillCatalogEntry } from "./types";

export function skillArtUrl(slug?: string | null): string | null {
  if (!slug?.trim()) return null;
  return `/skills/${slug.trim()}.webp`;
}

export function skillArtSlug(
  skill: Pick<Skill, "name"> & { skill_catalog?: Pick<SkillCatalogEntry, "slug"> | null }
): string {
  return skill.skill_catalog?.slug || skillSlugFromName(skill.name);
}
