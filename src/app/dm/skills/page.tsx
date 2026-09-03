"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { Crawler, Skill, SkillCatalogEntry, StatKey } from "@/lib/types";
import { STAT_LABELS } from "@/lib/types";
import { castSession } from "@/lib/utils";
import {
  defaultSkillType,
  skillRollLabel,
  skillSlugFromName,
} from "@/lib/skills";

const STAT_OPTIONS = (["str", "int", "con", "dex", "cha"] as const).map((s) => ({
  value: s,
  label: STAT_LABELS[s],
}));

const emptyForm = {
  name: "",
  roll_min: 1,
  roll_max: 1,
  page_ref: 27,
  animal_only: false,
};

type CatalogForm = typeof emptyForm;

export default function DMSkillsPage() {
  const supabase = createClient();
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([]);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [assignments, setAssignments] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SkillCatalogEntry | null>(null);
  const [form, setForm] = useState<CatalogForm>(emptyForm);
  const [assigning, setAssigning] = useState<SkillCatalogEntry | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [rank, setRank] = useState(0);
  const [linkedStat, setLinkedStat] = useState<StatKey>("str");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from("session_members")
      .select("sessions(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const sess = castSession(member?.sessions);

    const { data: cat } = await supabase.from("skill_catalog").select("*").order("roll_min");
    setCatalog((cat as SkillCatalogEntry[]) ?? []);

    if (!sess) {
      setCrawlers([]);
      setAssignments([]);
      return;
    }

    const { data: crawlerRows } = await supabase
      .from("crawlers")
      .select("*")
      .eq("session_id", sess.id)
      .order("name");
    const list = (crawlerRows as Crawler[]) ?? [];
    setCrawlers(list);

    if (list.length === 0) {
      setAssignments([]);
      return;
    }

    const { data: skillRows } = await supabase
      .from("skills")
      .select("id, crawler_id, catalog_id, name, rank")
      .in(
        "crawler_id",
        list.map((c) => c.id)
      );
    setAssignments((skillRows as Skill[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((s) => {
      const roll = skillRollLabel(s.roll_min, s.roll_max);
      return (
        s.name.toLowerCase().includes(q) ||
        roll.includes(q) ||
        String(s.page_ref).includes(q)
      );
    });
  }, [catalog, query]);

  const ownersByCatalog = useMemo(() => {
    const map = new Map<string, { skillId: string; crawler: Crawler }[]>();
    for (const skill of assignments) {
      if (!skill.catalog_id) continue;
      const crawler = crawlers.find((c) => c.id === skill.crawler_id);
      if (!crawler) continue;
      const list = map.get(skill.catalog_id) ?? [];
      list.push({ skillId: skill.id, crawler });
      map.set(skill.catalog_id, list);
    }
    return map;
  }, [assignments, crawlers]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
    setAssigning(null);
  }

  function openEdit(entry: SkillCatalogEntry) {
    setEditing(entry);
    setForm({
      name: entry.name,
      roll_min: entry.roll_min,
      roll_max: entry.roll_max,
      page_ref: entry.page_ref,
      animal_only: entry.animal_only,
    });
    setError("");
    setFormOpen(true);
    setAssigning(null);
  }

  function openAssign(entry: SkillCatalogEntry) {
    setAssigning(entry);
    setAssignIds([]);
    setRank(0);
    setLinkedStat("str");
    setError("");
    setFormOpen(false);
  }

  function uniqueSlug(name: string, exceptId?: string) {
    const base = skillSlugFromName(name);
    const taken = new Set(
      catalog.filter((s) => s.id !== exceptId).map((s) => s.slug)
    );
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n += 1;
    return `${base}-${n}`;
  }

  async function saveCatalog(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const rollMin = Number(form.roll_min);
    const rollMax = Number(form.roll_max);
    const pageRef = Number(form.page_ref);
    if (!form.name.trim()) {
      setError("Ponle un nombre a la skill.");
      return;
    }
    if (rollMin < 1 || rollMax > 100 || rollMax < rollMin) {
      setError("El rango d100 tiene que estar entre 1 y 100, con máximo ≥ mínimo.");
      return;
    }

    setBusy(true);
    const payload = {
      name: form.name.trim(),
      roll_min: rollMin,
      roll_max: rollMax,
      page_ref: pageRef,
      animal_only: form.animal_only,
    };

    const res = await fetch("/api/dm/skill-catalog", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        editing ? { id: editing.id, ...payload } : { ...payload, slug: uniqueSlug(form.name) }
      ),
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "No se pudo guardar la skill.");
      return;
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function deleteSkill(entry: SkillCatalogEntry) {
    const owners = ownersByCatalog.get(entry.id) ?? [];
    const names = owners.map((o) => o.crawler.name).join(", ");
    const ok = window.confirm(
      owners.length
        ? `¿Borrar ${entry.name}? Se quitará también de: ${names}.`
        : `¿Borrar ${entry.name} del catálogo?`
    );
    if (!ok) return;
    setError("");
    setBusy(true);
    if (owners.length) {
      const { error: unassignError } = await supabase
        .from("skills")
        .delete()
        .in(
          "id",
          owners.map((o) => o.skillId)
        );
      if (unassignError) {
        setBusy(false);
        setError(unassignError.message);
        return;
      }
    }
    const res = await fetch(`/api/dm/skill-catalog?id=${encodeURIComponent(entry.id)}`, {
      method: "DELETE",
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "No se pudo borrar la skill.");
      return;
    }
    if (editing?.id === entry.id) {
      setFormOpen(false);
      setEditing(null);
    }
    if (assigning?.id === entry.id) setAssigning(null);
    await load();
  }

  async function assignSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!assigning) return;
    setError("");
    if (assignIds.length === 0) {
      setError("Elige al menos un crawler.");
      return;
    }
    const owned = new Set((ownersByCatalog.get(assigning.id) ?? []).map((o) => o.crawler.id));
    const targets = assignIds.filter((id) => !owned.has(id));
    if (targets.length === 0) {
      setError("Esos crawlers ya tienen esta skill.");
      return;
    }

    setBusy(true);
    const { error: insertError } = await supabase.from("skills").insert(
      targets.map((crawlerId) => ({
        crawler_id: crawlerId,
        catalog_id: assigning.id,
        name: assigning.name,
        skill_type: defaultSkillType(assigning),
        rank,
        linked_stat: linkedStat,
      }))
    );
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAssigning(null);
    await load();
  }

  async function unassign(skillId: string) {
    setError("");
    const { error: deleteError } = await supabase.from("skills").delete().eq("id", skillId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  function toggleAssignId(id: string) {
    setAssignIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Skills</h2>
          <p className="text-xs text-[var(--text-cyan)]">Catálogo CarlRPG — crear, editar, borrar o asignar</p>
        </div>
        <Button variant="energy" onClick={formOpen && !editing ? () => setFormOpen(false) : openCreate}>
          {formOpen && !editing ? "Cancelar" : "Nueva skill"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {formOpen && (
        <GlassPanel title={editing ? `Editar ${editing.name}` : "Nueva skill"}>
          <form onSubmit={saveCatalog} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              id="skill-name"
              className="sm:col-span-2"
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              id="skill-roll-min"
              label="d100 mín"
              type="number"
              min={1}
              max={100}
              value={form.roll_min}
              onChange={(e) => setForm({ ...form, roll_min: +e.target.value })}
              required
            />
            <Input
              id="skill-roll-max"
              label="d100 máx"
              type="number"
              min={1}
              max={100}
              value={form.roll_max}
              onChange={(e) => setForm({ ...form, roll_max: +e.target.value })}
              required
            />
            <Input
              id="skill-page"
              label="Página"
              type="number"
              min={1}
              value={form.page_ref}
              onChange={(e) => setForm({ ...form, page_ref: +e.target.value })}
              required
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-[var(--text-2)]">
              <input
                type="checkbox"
                checked={form.animal_only}
                onChange={(e) => setForm({ ...form, animal_only: e.target.checked })}
                className="h-4 w-4 accent-[var(--cyan-400)]"
              />
              Solo animal
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
              <Button type="submit" variant="session" loading={busy}>
                {editing ? "Guardar cambios" : "Crear skill"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </GlassPanel>
      )}

      {assigning && (
        <GlassPanel title={`Asignar ${assigning.name}`} subtitle={`d100 ${skillRollLabel(assigning.roll_min, assigning.roll_max)}`}>
          <form onSubmit={assignSkill} className="space-y-4">
            {crawlers.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">No hay crawlers en esta sesión.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {crawlers.map((c) => {
                  const owned = (ownersByCatalog.get(assigning.id) ?? []).some((o) => o.crawler.id === c.id);
                  return (
                    <label
                      key={c.id}
                      className="well flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        disabled={owned}
                        checked={owned || assignIds.includes(c.id)}
                        onChange={() => toggleAssignId(c.id)}
                        className="h-4 w-4 accent-[var(--cyan-400)]"
                      />
                      <span className={owned ? "text-[var(--text-4)]" : "text-[var(--text-1)]"}>
                        {c.name}
                        {owned ? " · ya la tiene" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="assign-rank"
                label="Rango"
                type="number"
                min={0}
                value={rank}
                onChange={(e) => setRank(+e.target.value)}
              />
              <Select
                id="assign-stat"
                label="Característica"
                value={linkedStat}
                onChange={(e) => setLinkedStat(e.target.value as StatKey)}
                options={STAT_OPTIONS}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="session" loading={busy} disabled={crawlers.length === 0}>
                Asignar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAssigning(null)}>
                Cerrar
              </Button>
            </div>
          </form>
        </GlassPanel>
      )}

      <GlassPanel title="Tabla de skills" subtitle={`${catalog.length} en el catálogo`} action={
        <Input
          id="skill-search"
          placeholder="Buscar nombre, d100 o página…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 w-56"
        />
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--stroke-glass)] text-left text-label">
                <th className="p-3">d100</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Pág.</th>
                <th className="p-3">Animal</th>
                <th className="p-3">Crawlers</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const owners = ownersByCatalog.get(s.id) ?? [];
                return (
                  <tr key={s.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.04)]">
                    <td className="p-3 font-mono-system text-[var(--cyan-400)]">
                      {skillRollLabel(s.roll_min, s.roll_max)}
                    </td>
                    <td className="p-3 font-medium text-[var(--text-1)]">{s.name}</td>
                    <td className="p-3 text-[var(--text-3)]">{s.page_ref}</td>
                    <td className="p-3 text-[var(--text-3)]">{s.animal_only ? "Sí" : "—"}</td>
                    <td className="p-3">
                      {owners.length === 0 ? (
                        <span className="text-[var(--text-4)]">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {owners.map((o) => (
                            <button
                              key={o.skillId}
                              type="button"
                              title={`Quitar de ${o.crawler.name}`}
                              onClick={() => void unassign(o.skillId)}
                              className="rounded-full border border-[var(--stroke-glass)] px-2 py-0.5 text-[11px] text-[var(--text-2)] hover:border-[var(--stroke-danger)] hover:text-[var(--danger)]"
                            >
                              {o.crawler.name} ×
                            </button>
                          ))}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                          Editar
                        </Button>
                        <Button variant="neon" size="sm" onClick={() => openAssign(s)}>
                          Asignar
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => void deleteSkill(s)}>
                          Borrar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--text-3)]">
                    No hay skills que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
