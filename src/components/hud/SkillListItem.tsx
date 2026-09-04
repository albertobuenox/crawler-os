"use client";

import { Check, Minus, Plus } from "lucide-react";
import { SkillThumb } from "@/components/hud/SkillThumb";
import { cn } from "@/lib/utils";
import { formatSigned, statModifier } from "@/lib/rules";
import { SKILL_TYPE_LABEL } from "@/lib/copy";
import { skillArtSlug } from "@/lib/skill-art";
import { isActiveSkill, isSkillChecked, skillRollLabel } from "@/lib/skills";
import type { Crawler, Skill } from "@/lib/types";

export function SkillListItem({
  crawler,
  skill,
  canCheck,
  canAdjustRank,
  extra,
  onToggleCheck,
  onAdjustRank,
}: {
  crawler: Crawler;
  skill: Skill;
  canCheck?: boolean;
  canAdjustRank?: boolean;
  extra?: React.ReactNode;
  onToggleCheck?: (skill: Skill, checked: boolean) => void;
  onAdjustRank?: (skill: Skill, delta: -1 | 1) => void;
}) {
  const active = isActiveSkill(skill);
  const checked = isSkillChecked(skill);
  const showCheck = active && (canCheck || checked);

  return (
    <li className="well flex items-start gap-2.5 px-3 py-2 text-sm">
      <SkillThumb slug={skillArtSlug(skill)} size="md" className="mt-0.5" />
      {showCheck && (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? `${skill.name} marcada` : `Marcar ${skill.name}`}
          disabled={!canCheck}
          onClick={() => onToggleCheck?.(skill, !checked)}
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
            <p className="font-semibold text-[var(--text-1)]">{skill.name}</p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--magenta-400)]">
              {SKILL_TYPE_LABEL[skill.skill_type] ?? skill.skill_type}
              {skill.skill_catalog?.animal_only ? " · solo animal" : ""}
            </p>
          </div>
          {canAdjustRank ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Bajar rango de ${skill.name}`}
                disabled={skill.rank <= 0}
                onClick={() => onAdjustRank?.(skill, -1)}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--cyan-400)] hover:text-[var(--cyan-400)] disabled:opacity-35"
              >
                <Minus size={12} />
              </button>
              <span className="min-w-[2.25rem] text-center font-stat text-[var(--gold-400)]">R{skill.rank}</span>
              <button
                type="button"
                aria-label={`Subir rango de ${skill.name}`}
                disabled={skill.rank >= 20}
                onClick={() => onAdjustRank?.(skill, 1)}
                className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--cyan-400)] hover:text-[var(--cyan-400)] disabled:opacity-35"
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <span className="font-stat text-[var(--gold-400)]">R{skill.rank}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--text-3)]">
          {skill.linked_stat.toUpperCase()} {formatSigned(statModifier(crawler[`${skill.linked_stat}_enhanced`]))}
          {skill.skill_catalog && ` · d100 ${skillRollLabel(skill.skill_catalog.roll_min, skill.skill_catalog.roll_max)}`}
        </p>
        {extra}
      </div>
    </li>
  );
}
