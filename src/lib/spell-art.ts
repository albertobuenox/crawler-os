/**
 * Ilustraciones locales en `public/spells/`.
 * El slug del catálogo apunta al nombre del fichero.
 */

import { spellSlugFromName } from "./spells";
import type { Spell, SpellCatalogEntry } from "./types";

export const SPELL_ART_FILES: Record<string, string> = {
  "mind-tickle": "MIND TICKLE.webp",
};

export function spellArtUrl(slug?: string | null, thumbUrl?: string | null): string | null {
  if (thumbUrl?.trim()) return thumbUrl.trim();
  if (!slug?.trim()) return null;
  const name = slug.trim();
  const file = SPELL_ART_FILES[name] ?? `${name}.webp`;
  return `/spells/${encodeURIComponent(file)}`;
}

export function spellArtSlug(
  spell: Pick<Spell, "name"> & { spell_catalog?: Pick<SpellCatalogEntry, "slug"> | null }
): string {
  return spell.spell_catalog?.slug || spellSlugFromName(spell.name);
}

export function spellThumbUrl(
  spell: Pick<Spell, "name"> & { spell_catalog?: Pick<SpellCatalogEntry, "slug" | "thumb_url"> | null }
): string | null {
  return spell.spell_catalog?.thumb_url ?? null;
}
