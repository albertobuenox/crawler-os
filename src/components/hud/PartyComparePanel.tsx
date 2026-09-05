"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, Filter, Highlighter, Search, X } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { crawlerAvatarUrl, crawlerInitials, parseAvatarEmotion } from "@/lib/crawler-art";
import { crawlerClassLabel, crawlerRaceLabel, STATUS_LABEL } from "@/lib/copy";
import { formatSigned, formatStat, healthBarColor, healthBoxValue, STAT_KEYS, statModifier } from "@/lib/rules";
import { cn } from "@/lib/utils";
import type { Crawler, CrawlerStatus, Effect, Skill, StatKey } from "@/lib/types";
import { STAT_LABELS } from "@/lib/types";

type ViewMode = "filter" | "highlight";
type SortDir = "desc" | "asc";
type RowGroup = "identidad" | "vitales" | "stats" | "combate" | "skills" | "efectos";

type CellValue = {
  display: ReactNode;
  sort: number | string | null;
};

type CompareRow = {
  id: string;
  group: RowGroup;
  label: string;
  aliases: string[];
  cells: Record<string, CellValue>;
};

const GROUP_LABEL: Record<RowGroup, string> = {
  identidad: "Identidad",
  vitales: "Vitales",
  stats: "Stats",
  combate: "Combate",
  skills: "Skills",
  efectos: "Efectos",
};

const GROUP_ORDER: RowGroup[] = ["identidad", "vitales", "stats", "combate", "skills", "efectos"];

const STATUS_TONE: Record<CrawlerStatus, string> = {
  exploring: "text-[var(--ok)]",
  combat: "text-[var(--hp)]",
  downed: "text-[var(--orange-400)]",
  dead: "text-[var(--text-4)]",
  afk: "text-[var(--text-3)]",
};

const QUICK_CHIPS: { id: string; label: string; query: string }[] = [
  { id: "str", label: "STR", query: "str" },
  { id: "int", label: "INT", query: "int" },
  { id: "con", label: "CON", query: "con" },
  { id: "dex", label: "DEX", query: "dex" },
  { id: "cha", label: "CHA", query: "cha" },
  { id: "vida", label: "Vida", query: "vida" },
  { id: "mana", label: "Maná", query: "mana" },
  { id: "dr", label: "DR", query: "dr" },
  { id: "evade", label: "Evadir", query: "evadir" },
];

function norm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function rowMatches(row: CompareRow, query: string) {
  const q = norm(query);
  if (!q) return false;
  const haystack = [row.label, row.group, GROUP_LABEL[row.group], ...row.aliases].map(norm);
  return haystack.some((entry) => entry.includes(q) || q.includes(entry));
}

function bestIds(row: CompareRow, crawlerIds: string[]) {
  const numeric = crawlerIds
    .map((id) => ({ id, value: row.cells[id]?.sort }))
    .filter((entry): entry is { id: string; value: number } => typeof entry.value === "number");
  if (numeric.length === 0) return new Set<string>();
  const top = Math.max(...numeric.map((entry) => entry.value));
  return new Set(numeric.filter((entry) => entry.value === top).map((entry) => entry.id));
}

function lifeRemaining(crawler: Crawler) {
  return Math.min(10, Math.max(0, 10 - crawler.hp_boxes_filled));
}

function StatCell({ value, mod }: { value: number; mod: number }) {
  return (
    <div className="leading-none">
      <div className="font-stat text-xl text-[var(--cyan-400)]">{formatStat(value)}</div>
      <div className="mt-0.5 text-[10px] text-[var(--text-3)]">{formatSigned(mod)}</div>
    </div>
  );
}

function LifeCell({ crawler }: { crawler: Crawler }) {
  const life = lifeRemaining(crawler);
  const color = healthBarColor(life);
  const perBox = healthBoxValue(crawler.con_enhanced);
  return (
    <div>
      <div className="font-stat text-lg" style={{ color }}>
        {life}/10
      </div>
      <div className="mt-1 flex h-1.5 gap-px overflow-hidden rounded-full bg-black">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="min-w-0 flex-1"
            style={{ backgroundColor: i < life ? color : "rgba(255,255,255,0.08)" }}
          />
        ))}
      </div>
      <p className="mt-1 text-[10px] text-[var(--text-4)]">{perBox} PV / caja</p>
    </div>
  );
}

function ColumnAvatar({ crawler }: { crawler: Crawler }) {
  const src = crawlerAvatarUrl(crawler.name, crawler.portrait_url, parseAvatarEmotion(crawler.avatar_emotion));
  const [failed, setFailed] = useState(false);
  return (
    <span className="relative inline-flex h-12 w-12 overflow-hidden rounded-[12px] border border-[var(--stroke-magenta)] bg-[rgba(16,19,31,0.82)]">
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-[11px] tracking-widest text-[var(--cyan-400)]">
          {crawlerInitials(crawler.name)}
        </span>
      )}
    </span>
  );
}

function buildRows(crawlers: Crawler[], skills: Skill[], effects: Effect[]): CompareRow[] {
  const skillMap = new Map<string, Skill[]>();
  for (const skill of skills) {
    const list = skillMap.get(skill.crawler_id) ?? [];
    list.push(skill);
    skillMap.set(skill.crawler_id, list);
  }

  const effectMap = new Map<string, Effect[]>();
  for (const effect of effects) {
    const list = effectMap.get(effect.crawler_id) ?? [];
    list.push(effect);
    effectMap.set(effect.crawler_id, list);
  }

  const cells = (factory: (crawler: Crawler) => CellValue) =>
    Object.fromEntries(crawlers.map((crawler) => [crawler.id, factory(crawler)]));

  const rows: CompareRow[] = [
    {
      id: "level",
      group: "identidad",
      label: "Nivel",
      aliases: ["nv", "lv", "level"],
      cells: cells((c) => ({ display: <span className="font-stat text-lg text-[var(--text-1)]">{c.level}</span>, sort: c.level })),
    },
    {
      id: "race",
      group: "identidad",
      label: "Raza",
      aliases: ["race"],
      cells: cells((c) => ({ display: crawlerRaceLabel(c.race), sort: crawlerRaceLabel(c.race) })),
    },
    {
      id: "class",
      group: "identidad",
      label: "Clase",
      aliases: ["class", "clase"],
      cells: cells((c) => ({ display: crawlerClassLabel(c.class_name), sort: crawlerClassLabel(c.class_name) })),
    },
    {
      id: "status",
      group: "identidad",
      label: "Estado",
      aliases: ["status", "explorando", "combate", "caido", "muerto"],
      cells: cells((c) => ({
        display: <span className={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</span>,
        sort: STATUS_LABEL[c.status],
      })),
    },
    {
      id: "floor",
      group: "identidad",
      label: "Piso",
      aliases: ["floor", "fn"],
      cells: cells((c) => ({ display: <span className="font-stat text-lg">{c.floor}</span>, sort: c.floor })),
    },
    {
      id: "life",
      group: "vitales",
      label: "Vida",
      aliases: ["hp", "salud", "health", "cajas"],
      cells: cells((c) => ({ display: <LifeCell crawler={c} />, sort: lifeRemaining(c) })),
    },
    {
      id: "mana",
      group: "vitales",
      label: "Maná",
      aliases: ["mp", "mana", "magia"],
      cells: cells((c) => ({
        display: (
          <span className="font-stat text-lg text-[var(--mana)]">
            {c.mana_current}/{c.mana_max}
          </span>
        ),
        sort: c.mana_current,
      })),
    },
    {
      id: "favor",
      group: "vitales",
      label: "Favor IA",
      aliases: ["favor", "ai", "sponsor"],
      cells: cells((c) => ({
        display: <span className="font-stat text-lg text-[var(--gold-400)]">{c.ai_favor_remaining}</span>,
        sort: c.ai_favor_remaining,
      })),
    },
    ...STAT_KEYS.map((key: StatKey) => ({
      id: key,
      group: "stats" as const,
      label: `${STAT_LABELS[key]}+`,
      aliases: [
        key,
        STAT_LABELS[key],
        `${key}+`,
        key === "str" ? "fuerza" : "",
        key === "int" ? "inteligencia" : "",
        key === "con" ? "constitucion" : "",
        key === "dex" ? "destreza agilidad" : "",
        key === "cha" ? "carisma" : "",
      ].filter(Boolean),
      cells: cells((c) => {
        const enhanced = c[`${key}_enhanced`];
        const mod = statModifier(enhanced);
        return { display: <StatCell value={enhanced} mod={mod} />, sort: enhanced };
      }),
    })),
    {
      id: "dr",
      group: "combate",
      label: "DR",
      aliases: ["damage reduction", "reduccion", "armadura dr"],
      cells: cells((c) => ({
        display: <span className="font-stat text-lg text-[var(--magenta-400)]">{c.dr_total}</span>,
        sort: c.dr_total,
      })),
    },
    {
      id: "evade",
      group: "combate",
      label: "Evadir",
      aliases: ["evade", "evasión", "evasion", "esquiva"],
      cells: cells((c) => ({
        display: <span className="font-stat text-lg text-[var(--cyan-400)]">{c.evade_total}</span>,
        sort: c.evade_total,
      })),
    },
    {
      id: "move",
      group: "combate",
      label: "Move",
      aliases: ["movimiento", "desplazamiento"],
      cells: cells((c) => ({ display: <span className="font-stat text-lg">{c.move}</span>, sort: c.move })),
    },
    {
      id: "step",
      group: "combate",
      label: "Step",
      aliases: ["paso"],
      cells: cells((c) => ({ display: <span className="font-stat text-lg">{c.step}</span>, sort: c.step })),
    },
    {
      id: "armor",
      group: "combate",
      label: "Armadura",
      aliases: ["armor", "equipo"],
      cells: cells((c) => ({
        display: <span className="text-sm text-[var(--text-2)]">{c.armor?.trim() || "—"}</span>,
        sort: c.armor?.trim() || null,
      })),
    },
  ];

  const uniqueSkills = new Map<string, string>();
  for (const skill of skills) {
    const key = norm(skill.name);
    if (!uniqueSkills.has(key)) uniqueSkills.set(key, skill.name);
  }

  for (const [key, name] of [...uniqueSkills.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"))) {
    rows.push({
      id: `skill:${key}`,
      group: "skills",
      label: name,
      aliases: [name, "skill", "habilidad", "tirada"],
      cells: cells((c) => {
        const skill = (skillMap.get(c.id) ?? []).find((s) => norm(s.name) === key);
        if (!skill) return { display: <span className="text-[var(--text-4)]">—</span>, sort: null };
        const mod = statModifier(c[`${skill.linked_stat}_enhanced`]);
        return {
          display: (
            <div>
              <div className="font-stat text-lg text-[var(--gold-400)]">R{skill.rank}</div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                {skill.linked_stat} {formatSigned(mod)}
              </div>
            </div>
          ),
          sort: skill.rank * 100 + mod,
        };
      }),
    });
  }

  rows.push({
    id: "effects",
    group: "efectos",
    label: "Activos",
    aliases: ["buff", "debuff", "efecto", "estado"],
    cells: cells((c) => {
      const list = effectMap.get(c.id) ?? [];
      if (list.length === 0) return { display: <span className="text-[var(--text-4)]">—</span>, sort: 0 };
      return {
        display: (
          <div className="flex flex-col gap-1">
            {list.map((effect) => (
              <span
                key={effect.id}
                className="rounded-full bg-[rgba(232,121,249,0.12)] px-2 py-0.5 text-[10px] text-[var(--magenta-400)]"
              >
                {effect.name}
              </span>
            ))}
          </div>
        ),
        sort: list.length,
      };
    }),
  });

  return rows;
}

function compareCells(a: number | string | null, b: number | string | null, dir: SortDir) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  const result = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "es");
  return dir === "desc" ? -result : result;
}

export function PartyComparePanel({
  crawlers,
  skills,
  effects,
}: {
  crawlers: Crawler[];
  skills: Skill[];
  effects: Effect[];
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("filter");
  const [sortRowId, setSortRowId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => buildRows(crawlers, skills, effects), [crawlers, skills, effects]);
  const activeQuery = query.trim();
  const hasQuery = activeQuery.length > 0;

  const visibleRows = useMemo(() => {
    if (!hasQuery || mode === "highlight") return rows;
    return rows.filter((row) => rowMatches(row, activeQuery));
  }, [rows, hasQuery, mode, activeQuery]);

  const orderedCrawlers = useMemo(() => {
    const list = [...crawlers];
    if (!sortRowId) {
      return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    }
    const row = rows.find((entry) => entry.id === sortRowId);
    if (!row) return list;
    return list.sort((a, b) => compareCells(row.cells[a.id]?.sort ?? null, row.cells[b.id]?.sort ?? null, sortDir));
  }, [crawlers, rows, sortRowId, sortDir]);

  function toggleSort(rowId: string) {
    if (sortRowId === rowId) {
      setSortDir((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortRowId(rowId);
    setSortDir("desc");
  }

  function applyChip(chipQuery: string) {
    setQuery((current) => (norm(current) === norm(chipQuery) ? "" : chipQuery));
  }

  const columns = Math.max(orderedCrawlers.length, 1);

  return (
    <GlassPanel
      title="INTEL DE GRUPO"
      subtitle="Todas las fichas a la vez. Filtra un stat para la tirada o ilumínalo."
      className="!overflow-hidden"
      action={
        <div className="flex rounded-full border border-[var(--stroke-glass)] p-0.5">
          <button
            type="button"
            onClick={() => setMode("filter")}
            aria-pressed={mode === "filter"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] uppercase tracking-[0.12em] transition-colors",
              mode === "filter"
                ? "bg-[rgba(0,212,255,0.16)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
                : "text-[var(--text-3)] hover:text-[var(--text-1)]"
            )}
          >
            <Filter size={12} />
            Filtrar
          </button>
          <button
            type="button"
            onClick={() => setMode("highlight")}
            aria-pressed={mode === "highlight"}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] uppercase tracking-[0.12em] transition-colors",
              mode === "highlight"
                ? "bg-[rgba(251,191,36,0.16)] text-[var(--gold-400)] shadow-[var(--glow-gold)]"
                : "text-[var(--text-3)] hover:text-[var(--text-1)]"
            )}
          >
            <Highlighter size={12} />
            Iluminar
          </button>
        </div>
      }
    >
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
            }}
            placeholder="Busca STR, destreza, vida, una skill…"
            aria-label="Filtrar o iluminar un dato"
            className="well h-11 w-full pl-9 pr-10 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)] focus:border-[var(--stroke-cyan-hot)] focus:shadow-[var(--glow-cyan)]"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => {
            const active = norm(query) === norm(chip.query);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => applyChip(chip.query)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors",
                  active
                    ? "border-[var(--stroke-cyan-hot)] bg-[rgba(0,212,255,0.14)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
                    : "border-[var(--stroke-glass)] text-[var(--text-3)] hover:border-[var(--stroke-cyan)] hover:text-[var(--text-1)]"
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {crawlers.length === 0 ? (
        <p className="text-sm text-[var(--text-3)]">
          Aún no hay crawlers.{" "}
          <Link href="/dm/crawlers" className="text-[var(--cyan-400)]">
            Créalos aquí →
          </Link>
        </p>
      ) : (
        <div className="relative isolate max-h-[min(62vh,42rem)] overflow-auto rounded-[14px] border border-[var(--stroke-glass)]">
          <div
            className="min-w-max"
            style={{
              display: "grid",
              gridTemplateColumns: `9.25rem repeat(${columns}, minmax(9.5rem, 1fr))`,
            }}
          >
            <div className="sticky left-0 top-0 z-[3] border-b border-[var(--stroke-glass)] bg-[rgba(10,12,24,0.96)] px-3 py-3 text-label">
              Dato
            </div>
            {orderedCrawlers.map((crawler) => (
              <div
                key={crawler.id}
                className="sticky top-0 z-[2] border-b border-l border-[var(--stroke-glass)] bg-[rgba(10,12,24,0.96)] px-3 py-3"
              >
                <Link href={`/dm/crawlers/${crawler.id}`} className="group flex items-start gap-2.5">
                  <ColumnAvatar crawler={crawler} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 font-display text-sm tracking-wide text-[var(--text-1)] group-hover:text-[var(--cyan-300)]">
                      {crawler.name}
                      <Eye size={11} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="block text-[10px] text-[var(--text-cyan)]">
                      LV {crawler.level} · {crawlerClassLabel(crawler.class_name)}
                    </span>
                    <span className={cn("block text-[10px]", STATUS_TONE[crawler.status])}>
                      {STATUS_LABEL[crawler.status]}
                    </span>
                  </span>
                </Link>
              </div>
            ))}

            {GROUP_ORDER.map((group) => {
              const groupRows = visibleRows.filter((row) => row.group === group);
              if (groupRows.length === 0) return null;
              return (
                <div key={group} className="contents">
                  <div
                    className="sticky left-0 z-[1] border-y border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] px-3 py-1.5 text-label text-[var(--cyan-300)]"
                    style={{ gridColumn: "1 / -1" }}
                  >
                    {GROUP_LABEL[group]}
                    {group === "skills" ? ` · ${groupRows.length}` : ""}
                  </div>
                  {groupRows.map((row, index) => {
                    const matched = hasQuery && rowMatches(row, activeQuery);
                    const winners = bestIds(row, orderedCrawlers.map((crawler) => crawler.id));
                    const dim = hasQuery && mode === "highlight" && !matched;
                    const glow = hasQuery && mode === "highlight" && matched;
                    const sorted = sortRowId === row.id;
                    return (
                      <div key={row.id} className="contents">
                        <button
                          type="button"
                          onClick={() => toggleSort(row.id)}
                          title="Ordenar crawlers por este dato"
                          className={cn(
                            "sticky left-0 z-[1] border-t border-[var(--stroke-glass)] px-3 py-2.5 text-left text-[11px] uppercase tracking-[0.12em]",
                            index % 2 === 0 ? "bg-[rgba(10,12,24,0.96)]" : "bg-[rgba(16,19,31,0.96)]",
                            glow && "bg-[rgba(251,191,36,0.12)] text-[var(--gold-400)]",
                            dim && "opacity-35",
                            sorted && "text-[var(--cyan-300)]"
                          )}
                        >
                          <span className="inline-flex items-center gap-1">
                            {row.label}
                            {sorted ? sortDir === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} /> : null}
                          </span>
                        </button>
                        {orderedCrawlers.map((crawler) => {
                          const cell = row.cells[crawler.id];
                          const win = winners.has(crawler.id);
                          return (
                            <div
                              key={`${row.id}-${crawler.id}`}
                              className={cn(
                                "border-l border-t border-[var(--stroke-glass)] px-3 py-2.5 text-sm",
                                index % 2 === 0 ? "bg-[rgba(5,6,13,0.35)]" : "bg-[rgba(255,255,255,0.02)]",
                                glow && "bg-[rgba(251,191,36,0.10)] shadow-[inset_0_0_0_1px_rgba(251,191,36,0.35)]",
                                dim && "opacity-35",
                                win && !dim && "text-[var(--gold-400)]"
                              )}
                            >
                              {cell?.display ?? "—"}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {visibleRows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-[var(--text-3)]">
              Ningún dato coincide con “{activeQuery}”. Prueba otro stat o skill.
            </p>
          )}
        </div>
      )}
      {crawlers.length > 0 && (
        <p className="mt-3 text-[11px] text-[var(--text-4)]">
          Clic en un dato para ordenar. El valor más alto de cada fila se marca en oro.
        </p>
      )}
    </GlassPanel>
  );
}
