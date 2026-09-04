/**
 * Ilustraciones locales:
 * - Attack: `public/skills/attack/<slug>.webp`
 * - Resto:  `public/skills/<slug>.webp`
 * El slug es el del catálogo (aiming, animal-handling, wrasslin…).
 * Si el archivo aún no está, la UI muestra un recuadro vacío.
 */

import { ATTACK_SKILL_SLUGS, skillSlugFromName } from "./skills";
import type { Skill, SkillCatalogEntry } from "./types";

export function skillArtUrl(
  slug?: string | null,
  skillType?: Skill["skill_type"] | null,
  thumbUrl?: string | null
): string | null {
  if (thumbUrl?.trim()) return thumbUrl.trim();
  if (!slug?.trim()) return null;
  const name = slug.trim();
  if (skillType === "attack" || ATTACK_SKILL_SLUGS.has(name)) {
    return `/skills/attack/${name}.webp`;
  }
  return `/skills/${name}.webp`;
}

export function skillArtSlug(
  skill: Pick<Skill, "name"> & { skill_catalog?: Pick<SkillCatalogEntry, "slug"> | null }
): string {
  return skill.skill_catalog?.slug || skillSlugFromName(skill.name);
}

export function skillThumbUrl(
  skill: Pick<Skill, "name"> & { skill_catalog?: Pick<SkillCatalogEntry, "slug" | "thumb_url"> | null }
): string | null {
  return skill.skill_catalog?.thumb_url ?? null;
}
