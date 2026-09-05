"use client";

import { Check, Minus, Plus } from "lucide-react";
import { SpellThumb } from "@/components/hud/SpellThumb";
import { cn } from "@/lib/utils";
import { formatSigned, statModifier } from "@/lib/rules";
import { SKILL_KIND_LABEL } from "@/lib/copy";
import { spellArtSlug } from "@/lib/spell-art";
import { isSpellChecked, SPELL_RANK_MAX, SPELL_RANK_MIN } from "@/lib/spells";
import type { Crawler, Spell } from "@/lib/types";

export function SpellListItem({
  crawler,
  spell,
  canCheck,
  canAdjustRank,
  extra,
  onToggleCheck,
  onAdjustRank,
}: {
  crawler: Crawler;
  spell: Spell;
  canCheck?: boolean;
  canAdjustRank?: boolean;
  extra?: React.ReactNode;
  onToggleCheck?: (spell: Spell, checked: boolean) => void;
  onAdjustRank?: (spell: Spell, delta: -1 | 1) => void;
}) {
  const checked = isSpellChecked(spell);
  const showCheck = canCheck || checked;

  return (
    <li className="well flex items-start gap-2.5 px-3 py-2 text-sm">
      <SpellThumb
        slug={spellArtSlug(spell)}
        thumbUrl={spell.spell_catalog?.thumb_url}
        size="md"
        className="mt-0.5"
        tip={spell}
      />
      {showCheck && (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? `${spell.name} marcado` : `Marcar ${spell.name}`}
          disabled={!canCheck}
          onClick={() => onToggleCheck?.(spell, !checked)}
          className={cn(
            "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
            checked
              ? "border-[var(--gold-400)] bg-[rgba(251,191,36,0.16)] text-[var(--gold-400)] shadow-[0_0_8px_rgba(251,191,36,0.4)]"
              : "border-[var(--stroke-glass)] text-transparent hover:border-[var(--gold-400)] hover:text-[var(--gold-400)]",
            !canCheck && "cursor-default"
          )}
        >
          <Check size={14} strokeWidth={2.5} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-[var(--text-1)]">{spell.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--magenta-400)]">
              {spell.spell_catalog?.kind
                ? (SKILL_KIND_LABEL[spell.spell_catalog.kind] ?? spell.spell_catalog.kind)
                : "Conjuro"}
            </p>
          </div>
          {canAdjustRank ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Bajar rango de ${spell.name}`}
                disabled={spell.rank <= SPELL_RANK_MIN}
                onClick={() => onAdjustRank?.(spell, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--cyan-400)] hover:text-[var(--cyan-400)] disabled:opacity-35"
              >
                <Minus size={12} />
              </button>
              <span className="min-w-[2.25rem] text-center font-stat text-[var(--gold-400)]">R{spell.rank}</span>
              <button
                type="button"
                aria-label={`Subir rango de ${spell.name}`}
                disabled={spell.rank >= SPELL_RANK_MAX}
                onClick={() => onAdjustRank?.(spell, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--cyan-400)] hover:text-[var(--cyan-400)] disabled:opacity-35"
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <span className="font-stat text-[var(--gold-400)]">R{spell.rank}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          {spell.linked_stat.toUpperCase()} {formatSigned(statModifier(crawler[`${spell.linked_stat}_enhanced`]))}
        </p>
        {spell.spell_catalog?.description?.trim() ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)]">{spell.spell_catalog.description.trim()}</p>
        ) : null}
        {extra}
      </div>
    </li>
  );
}
