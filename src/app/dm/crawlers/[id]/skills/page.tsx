"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { Skill, SkillCatalogEntry, StatKey } from "@/lib/types";
import { SKILL_TYPE_LABEL } from "@/lib/copy";
import { catalogOptionLabel, defaultSkillType, pickSkillByRoll, skillRollLabel } from "@/lib/skills";

const STAT_OPTIONS = (["str", "int", "con", "dex", "cha"] as const).map((s) => ({
  value: s,
  label: s.toUpperCase(),
}));

export default function DMSkillsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([]);
  const [catalogId, setCatalogId] = useState("");
  const [rank, setRank] = useState(0);
  const [linkedStat, setLinkedStat] = useState<StatKey>("str");
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function reloadSkills() {
    const { data } = await supabase
      .from("skills")
      .select("*, skill_catalog(*)")
      .eq("crawler_id", id)
      .order("created_at");
    setSkills((data as Skill[]) ?? []);
  }

  useEffect(() => {
    if (!id) return;
    supabase
      .from("skill_catalog")
      .select("*")
      .order("roll_min")
      .then(({ data }) => setCatalog((data as SkillCatalogEntry[]) ?? []));
    reloadSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, supabase]);

  const ownedIds = useMemo(
    () => new Set(skills.map((s) => s.catalog_id).filter(Boolean)),
    [skills]
  );

  const selected = catalog.find((s) => s.id === catalogId) ?? null;

  function rollCatalog() {
    const n = Math.floor(Math.random() * 100) + 1;
    setLastRoll(n);
    const hit = pickSkillByRoll(catalog, n);
    if (hit) setCatalogId(hit.id);
  }

  async function addSkill(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!selected) {
      setError("Elige una habilidad del catálogo.");
      return;
    }
    if (ownedIds.has(selected.id)) {
      setError(`${selected.name} ya está en esta hoja.`);
      return;
    }
    const { error: insertError } = await supabase.from("skills").insert({
      crawler_id: id,
      catalog_id: selected.id,
      name: selected.name,
      skill_type: defaultSkillType(selected),
      rank,
      linked_stat: linkedStat,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCatalogId("");
    setLastRoll(null);
    await reloadSkills();
  }

  async function markCheck(skillId: string, marks: number) {
    await supabase.from("skills").update({ check_marks: marks }).eq("id", skillId);
    await reloadSkills();
  }

  const options = [
    { value: "", label: "Elegir habilidad…" },
    ...catalog.map((s) => ({
      value: s.id,
      label: `${catalogOptionLabel(s)}${ownedIds.has(s.id) ? " ✓" : ""}`,
    })),
  ];

  return (
    <GlassPanel title="Editor de habilidades" subtitle="Catálogo CarlRPG — tirar o elegir">
      <form onSubmit={addSkill} className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Select
            label="Habilidad"
            value={catalogId}
            onChange={(e) => {
              setCatalogId(e.target.value);
              setError("");
            }}
            options={options}
          />
        </div>
        {selected && (
          <p className="sm:col-span-2 text-xs text-[var(--text-3)]">
            d100 {skillRollLabel(selected.roll_min, selected.roll_max)} · pág. {selected.page_ref}
            {selected.animal_only ? " · solo animal" : ""}
          </p>
        )}
        <Input label="Rango" type="number" value={rank} onChange={(e) => setRank(+e.target.value)} />
        <Select
          label="Característica"
          value={linkedStat}
          onChange={(e) => setLinkedStat(e.target.value as StatKey)}
          options={STAT_OPTIONS}
        />
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <Button type="button" variant="neon" onClick={rollCatalog}>
            Tirar d100{lastRoll ? ` (${lastRoll})` : ""}
          </Button>
          <Button type="submit" variant="session">
            Añadir a la hoja
          </Button>
        </div>
        {error && <p className="sm:col-span-2 text-xs text-[var(--danger)]">{error}</p>}
      </form>
      <ul className="space-y-2">
        {skills.length === 0 && (
          <li className="text-sm text-[var(--text-3)]">Esta hoja aún no tiene habilidades.</li>
        )}
        {skills.map((s) => {
          const cat = s.skill_catalog;
          return (
            <li key={s.id} className="well flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-semibold text-[var(--text-1)]">{s.name}</span>
                <span className="ml-2 text-[var(--text-3)]">
                  rango {s.rank} · {SKILL_TYPE_LABEL[s.skill_type] ?? s.skill_type}
                </span>
                {cat && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                    d100 {skillRollLabel(cat.roll_min, cat.roll_max)} · pág. {cat.page_ref}
                    {cat.animal_only ? " · solo animal" : ""}
                  </span>
                )}
                <span className="ml-2 text-[var(--text-4)]">marcas: {s.check_marks}</span>
              </span>
              <Button variant="neon" size="sm" onClick={() => markCheck(s.id, s.check_marks + 1)}>
                + Marca
              </Button>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}
