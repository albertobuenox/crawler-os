"use client";

import { SkillHoverTip } from "@/components/hud/SkillHoverTip";
import { SkillThumb } from "@/components/hud/SkillThumb";
import { toSpellTip } from "@/lib/skill-tip";
import type { Spell, SpellCatalogEntry } from "@/lib/types";

export function SpellThumb({
  slug,
  thumbUrl,
  size = "sm",
  className,
  tip,
}: {
  slug?: string | null;
  thumbUrl?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  tip?: Spell | SpellCatalogEntry | null;
}) {
  const icon = (
    <SkillThumb slug={slug} skillType="spell" thumbUrl={thumbUrl} size={size} className={className} />
  );
  if (!tip) return icon;
  return <SkillHoverTip info={toSpellTip(tip)}>{icon}</SkillHoverTip>;
}
