"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { Spell, SpellCatalogEntry, StatKey } from "@/lib/types";
import { SKILL_KIND_LABEL } from "@/lib/copy";
import { catalogSpellLabel, clampSpellRank, SPELL_RANK_MAX, SPELL_RANK_MIN, sortSpellsStable } from "@/lib/spells";
import { spellArtSlug } from "@/lib/spell-art";
import { SpellThumb } from "@/components/hud/SpellThumb";

const STAT_OPTIONS = (["str", "int", "con", "dex", "cha"] as const).map((s) => ({
  value: s,
  label: s.toUpperCase(),
}));

export default function DMSpellsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [spells, setSpells] = useState<Spell[]>([]);
  const [catalog, setCatalog] = useState<SpellCatalogEntry[]>([]);
  const [catalogId, setCatalogId] = useState("");
  const [rank, setRank] = useState(SPELL_RANK_MIN);
  const [linkedStat, setLinkedStat] = useState<StatKey>("int");
  const [error, setError] = useState("");

  async function reloadSpells() {
    const { data } = await supabase
      .from("spells")
      .select("*, spell_catalog(*)")
      .eq("crawler_id", id)
      .order("created_at");
    setSpells(sortSpellsStable((data as Spell[]) ?? []));
  }

  useEffect(() => {
    if (!id) return;
    supabase
      .from("spell_catalog")
      .select("*")
      .order("name")
      .then(({ data }) => setCatalog((data as SpellCatalogEntry[]) ?? []));
    reloadSpells();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabase]);

  const ownedIds = useMemo(
    () => new Set(spells.map((s) => s.catalog_id).filter(Boolean)),
    [spells]
  );

  const selected = catalog.find((s) => s.id === catalogId) ?? null;

  async function addSpell(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selected) {
      setError("Elige un conjuro del catálogo.");
      return;
    }
    if (ownedIds.has(selected.id)) {
      setError(`${selected.name} ya está en esta hoja.`);
      return;
    }
    const { error: insertError } = await supabase.from("spells").insert({
      crawler_id: id,
      catalog_id: selected.id,
      name: selected.name,
      rank: clampSpellRank(rank),
      linked_stat: linkedStat,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCatalogId("");
    await reloadSpells();
  }

  async function markCheck(spellId: string, marks: number) {
    await supabase.from("spells").update({ check_marks: marks }).eq("id", spellId);
    await reloadSpells();
  }

  const options = [
    { value: "", label: "Elegir conjuro…" },
    ...catalog.map((s) => ({
      value: s.id,
      label: `${catalogSpellLabel(s)}${ownedIds.has(s.id) ? " ✓" : ""}`,
    })),
  ];

  return (
    <GlassPanel title="Editor de spells" subtitle="Catálogo de conjuros — elegir y asignar">
      <form onSubmit={addSpell} className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            label="Spell"
            value={catalogId}
            onChange={(e) => {
              setCatalogId(e.target.value);
              setError("");
            }}
            options={options}
          />
        </div>
        {selected && (
          <div className="sm:col-span-2 flex items-center gap-3">
            <SpellThumb slug={selected.slug} thumbUrl={selected.thumb_url} size="md" tip={selected} />
            <p className="text-xs text-[var(--text-3)]">
              {selected.kind ? SKILL_KIND_LABEL[selected.kind] ?? selected.kind : "Conjuro"}
            </p>
          </div>
        )}
        <Input
          label="Rango"
          type="number"
          min={SPELL_RANK_MIN}
          max={SPELL_RANK_MAX}
          value={rank}
          onChange={(e) => setRank(clampSpellRank(+e.target.value))}
        />
        <Select
          label="Característica"
          value={linkedStat}
          onChange={(e) => setLinkedStat(e.target.value as StatKey)}
          options={STAT_OPTIONS}
        />
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <Button type="submit" variant="session">
            Añadir a la hoja
          </Button>
        </div>
        {error && <p className="sm:col-span-2 text-xs text-[var(--danger)]">{error}</p>}
      </form>
      <ul className="space-y-2">
        {spells.length === 0 && (
          <li className="text-sm text-[var(--text-3)]">Esta hoja aún no tiene spells.</li>
        )}
        {spells.map((s) => {
          const cat = s.spell_catalog;
          return (
            <li key={s.id} className="well flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2.5">
                <SpellThumb slug={spellArtSlug(s)} thumbUrl={s.spell_catalog?.thumb_url} size="sm" tip={s} />
                <span>
                  <span className="font-semibold text-[var(--text-1)]">{s.name}</span>
                  <span className="ml-2 text-[var(--text-3)]">rango {s.rank}</span>
                  {cat?.kind && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                      {SKILL_KIND_LABEL[cat.kind] ?? cat.kind}
                    </span>
                  )}
                  <span className="ml-2 text-[var(--text-4)]">marcas: {s.check_marks}</span>
                </span>
              </span>
              <Button
                variant="neon"
                size="sm"
                onClick={() => markCheck(s.id, s.check_marks > 0 ? 0 : 1)}
              >
                {s.check_marks > 0 ? "Quitar marca" : "Marcar"}
              </Button>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
