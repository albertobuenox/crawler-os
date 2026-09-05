import type { Spell, SpellCatalogEntry } from "./types";
import { SKILL_RANK_MAX, SKILL_RANK_MIN, clampSkillRank, isSkillKind, skillSlugFromName } from "./skills";

export { SKILL_RANK_MAX as SPELL_RANK_MAX, SKILL_RANK_MIN as SPELL_RANK_MIN, clampSkillRank as clampSpellRank, isSkillKind, skillSlugFromName as spellSlugFromName };

export function sortSpellsStable<T extends Pick<Spell, "id"> & { created_at?: string }>(spells: T[]): T[] {
  return [...spells].sort((a, b) => {
    const byDate = (a.created_at ?? "").localeCompare(b.created_at ?? "");
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export function isSpellChecked(spell: Pick<Spell, "check_marks">): boolean {
  return spell.check_marks > 0;
}

export function catalogSpellLabel(entry: SpellCatalogEntry): string {
  return entry.name;
}
