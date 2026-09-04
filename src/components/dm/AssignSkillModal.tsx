"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SkillThumb } from "@/components/hud/SkillThumb";
import { BRAND, SKILL_KIND_LABEL } from "@/lib/copy";
import { STAT_LABELS } from "@/lib/types";
import {
  clampSkillRank,
  defaultSkillType,
  SKILL_RANK_MAX,
  SKILL_RANK_MIN,
  skillRollLabel,
} from "@/lib/skills";
import type { Crawler, SkillCatalogEntry, StatKey } from "@/lib/types";
import { crawlerAvatarUrl, crawlerInitials } from "@/lib/crawler-art";
import { cn } from "@/lib/utils";

const STAT_OPTIONS = (["str", "int", "con", "dex", "cha"] as const).map((s) => ({
  value: s,
  label: STAT_LABELS[s],
}));

interface AssignSkillModalProps {
  open: boolean;
  skill: SkillCatalogEntry | null;
  crawlers: Crawler[];
  ownedIds: Set<string>;
  assignIds: string[];
  rank: number;
  linkedStat: StatKey;
  busy?: boolean;
  error?: string;
  onToggle: (id: string) => void;
  onRank: (rank: number) => void;
  onStat: (stat: StatKey) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AssignSkillModal({
  open,
  skill,
  crawlers,
  ownedIds,
  assignIds,
  rank,
  linkedStat,
  busy = false,
  error = "",
  onToggle,
  onRank,
  onStat,
  onClose,
  onSubmit,
}: AssignSkillModalProps) {
  const [cached, setCached] = useState<SkillCatalogEntry | null>(skill);
  useEffect(() => {
    if (skill) setCached(skill);
  }, [skill]);
  const shown = skill ?? cached;
  if (!shown) return null;

  const available = crawlers.filter((c) => !ownedIds.has(c.id)).length;
  const kindLabel = shown.kind ? SKILL_KIND_LABEL[shown.kind] ?? shown.kind : "";
  const roll = skillRollLabel(shown.roll_min, shown.roll_max, shown.slug);

  return (
    <Modal
      open={open}
      wide
      eyebrow={`${BRAND} — ASIGNAR`}
      title={shown.name}
      subtitle={[kindLabel, shown.animal_only ? "solo animal" : null, roll !== "—" ? `d100 ${roll}` : null]
        .filter(Boolean)
        .join(" · ")}
      action={
        <SkillThumb
          slug={shown.slug}
          skillType={defaultSkillType(shown)}
          thumbUrl={shown.thumb_url}
          size="md"
        />
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {shown.description?.trim() ? (
          <p className="rounded-xl border border-[var(--stroke-glass)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm leading-relaxed text-[var(--text-2)]">
            {shown.description.trim()}
          </p>
        ) : (
          <p className="text-xs text-[var(--text-4)]">Sin descripción todavía.</p>
        )}

        <div>
          <p className="mb-2 text-label">Crawlers</p>
          {crawlers.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">No hay crawlers en esta sesión.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {crawlers.map((crawler) => {
                const owned = ownedIds.has(crawler.id);
                const selected = owned || assignIds.includes(crawler.id);
                const src = crawlerAvatarUrl(crawler.name, crawler.portrait_url);
                return (
                  <li key={crawler.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                        owned
                          ? "cursor-default border-[var(--stroke-glass)] opacity-55"
                          : selected
                            ? "border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)]"
                            : "border-[var(--stroke-glass)] hover:border-[var(--stroke-cyan)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        disabled={owned}
                        checked={selected}
                        onChange={() => onToggle(crawler.id)}
                      />
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--stroke-glass)] text-[10px] font-display text-[var(--cyan-400)]">
                          {crawlerInitials(crawler.name)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--text-1)]">
                          {crawler.name}
                        </span>
                        <span className="block text-[11px] text-[var(--text-4)]">
                          {owned ? "Ya la tiene" : "Sin asignar"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {available === 0 && crawlers.length > 0 && (
            <p className="mt-2 text-xs text-[var(--text-4)]">Todos los crawlers de la sesión ya tienen esta skill.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="assign-rank"
            label="Rango inicial"
            type="number"
            min={SKILL_RANK_MIN}
            max={SKILL_RANK_MAX}
            value={rank}
            onChange={(e) => onRank(clampSkillRank(+e.target.value))}
          />
          <Select
            id="assign-stat"
            label="Característica"
            value={linkedStat}
            onChange={(e) => onStat(e.target.value as StatKey)}
            options={STAT_OPTIONS}
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="session" loading={busy} disabled={crawlers.length === 0}>
            Asignar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
