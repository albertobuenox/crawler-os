"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { AssignSkillModal } from "@/components/dm/AssignSkillModal";
import { CreateSkillModal } from "@/components/dm/CreateSkillModal";
import type { Crawler, Skill, SkillCatalogEntry, SkillKind, StatKey } from "@/lib/types";
import { SKILL_KIND_LABEL, skillKindLabel } from "@/lib/copy";
import { castSession } from "@/lib/utils";
import {
  clampSkillRank,
  defaultSkillType,
  SKILL_RANK_MIN,
  skillRollLabel,
  skillSlugFromName,
} from "@/lib/skills";
import { SkillThumb } from "@/components/hud/SkillThumb";
import { useCreateRequest } from "@/hooks/useDmDeepLink";
import { cn } from "@/lib/utils";

const KIND_PILL: Record<SkillKind, string> = {
  ataque: "text-[var(--orange-400)]",
  defensa: "text-[var(--cyan-400)]",
  apoyo: "text-[var(--gold-400)]",
  destreza: "text-[var(--magenta-400)]",
};

export default function DMSkillsPage() {
  const supabase = createClient();
  const [catalog, setCatalog] = useState<SkillCatalogEntry[]>([]);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [assignments, setAssignments] = useState<Skill[]>([]);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SkillCatalogEntry | null>(null);
  const [assigning, setAssigning] = useState<SkillCatalogEntry | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [rank, setRank] = useState(SKILL_RANK_MIN);
  const [linkedStat, setLinkedStat] = useState<StatKey>("str");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [assignError, setAssignError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SkillCatalogEntry | null>(null);

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
      const roll = skillRollLabel(s.roll_min, s.roll_max, s.slug);
      const kind = skillKindLabel(s.kind);
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        kind.toLowerCase().includes(q) ||
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

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
    setAssigning(null);
  }, []);
  useCreateRequest("skill", openCreate);

  function openEdit(entry: SkillCatalogEntry) {
    setEditing(entry);
    setFormError("");
    setFormOpen(true);
    setAssigning(null);
  }

  function openAssign(entry: SkillCatalogEntry) {
    setAssigning(entry);
    setAssignIds([]);
    setRank(SKILL_RANK_MIN);
    setLinkedStat("str");
    setAssignError("");
    setFormOpen(false);
  }

  function uniqueSlug(name: string, exceptId?: string) {
    const base = skillSlugFromName(name);
    const taken = new Set(catalog.filter((s) => s.id !== exceptId).map((s) => s.slug));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n += 1;
    return `${base}-${n}`;
  }

  async function saveCatalog(payload: {
    name: string;
    description: string;
    kind: SkillKind;
    animal_only: boolean;
    thumb?: File | null;
  }) {
    setFormError("");
    setBusy(true);
    const form = new FormData();
    form.set("name", payload.name);
    form.set("description", payload.description);
    form.set("kind", payload.kind);
    form.set("animal_only", payload.animal_only ? "true" : "false");
    if (editing) form.set("id", editing.id);
    else form.set("slug", uniqueSlug(payload.name));
    if (payload.thumb) form.set("thumb", payload.thumb);

    const res = await fetch("/api/dm/skill-catalog", {
      method: editing ? "PATCH" : "POST",
      body: form,
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setFormError(body.error || "No se pudo guardar la skill.");
      return;
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function deleteSkill() {
    if (!pendingDelete) return;
    const owners = ownersByCatalog.get(pendingDelete.id) ?? [];
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
    const res = await fetch(`/api/dm/skill-catalog?id=${encodeURIComponent(pendingDelete.id)}`, {
      method: "DELETE",
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "No se pudo borrar la skill.");
      return;
    }
    if (editing?.id === pendingDelete.id) {
      setFormOpen(false);
      setEditing(null);
    }
    if (assigning?.id === pendingDelete.id) setAssigning(null);
    setPendingDelete(null);
    await load();
  }

  async function assignSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!assigning) return;
    setAssignError("");
    if (assignIds.length === 0) {
      setAssignError("Elige al menos un crawler.");
      return;
    }
    const owned = new Set((ownersByCatalog.get(assigning.id) ?? []).map((o) => o.crawler.id));
    const targets = assignIds.filter((id) => !owned.has(id));
    if (targets.length === 0) {
      setAssignError("Esos crawlers ya tienen esta skill.");
      return;
    }

    setBusy(true);
    const { error: insertError } = await supabase.from("skills").insert(
      targets.map((crawlerId) => ({
        crawler_id: crawlerId,
        catalog_id: assigning.id,
        name: assigning.name,
        skill_type: defaultSkillType(assigning),
        rank: clampSkillRank(rank),
        linked_stat: linkedStat,
      }))
    );
    setBusy(false);
    if (insertError) {
      setAssignError(insertError.message);
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
        <Button variant="energy" onClick={openCreate}>
          Nueva skill
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <GlassPanel
        title="Tabla de skills"
        subtitle={`${catalog.length} en el catálogo`}
        action={
          <Input
            id="skill-search"
            placeholder="Buscar nombre, tipo o d100…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-56"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--stroke-glass)] text-left text-label">
                <th className="p-3 w-14">Art</th>
                <th className="p-3">d100</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Animal</th>
                <th className="p-3">Crawlers</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const owners = ownersByCatalog.get(s.id) ?? [];
                const kind = (s.kind ?? "apoyo") as SkillKind;
                return (
                  <tr key={s.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.04)]">
                    <td className="p-3">
                      <SkillThumb
                        slug={s.slug}
                        skillType={defaultSkillType(s)}
                        thumbUrl={s.thumb_url}
                        size="sm"
                      />
                    </td>
                    <td className="p-3 font-mono-system text-[var(--cyan-400)]">
                      {skillRollLabel(s.roll_min, s.roll_max, s.slug)}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-[var(--text-1)]">{s.name}</p>
                      {s.description?.trim() ? (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-[var(--text-4)]">{s.description}</p>
                      ) : null}
                    </td>
                    <td className={cn("p-3 text-xs uppercase tracking-wider", KIND_PILL[kind])}>
                      {SKILL_KIND_LABEL[kind] ?? kind}
                    </td>
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
                        <Button variant="danger" size="sm" onClick={() => setPendingDelete(s)}>
                          Borrar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[var(--text-3)]">
                    No hay skills que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <CreateSkillModal
        open={formOpen}
        editing={editing}
        busy={busy}
        error={formError}
        onClose={() => {
          if (!busy) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onSubmit={(payload) => void saveCatalog(payload)}
      />

      <AssignSkillModal
        open={!!assigning}
        skill={assigning}
        crawlers={crawlers}
        ownedIds={new Set((assigning ? ownersByCatalog.get(assigning.id) ?? [] : []).map((o) => o.crawler.id))}
        assignIds={assignIds}
        rank={rank}
        linkedStat={linkedStat}
        busy={busy}
        error={assignError}
        onToggle={toggleAssignId}
        onRank={setRank}
        onStat={setLinkedStat}
        onClose={() => {
          if (!busy) setAssigning(null);
        }}
        onSubmit={(e) => void assignSkill(e)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title={`¿Borrar ${pendingDelete?.name ?? "esta skill"}?`}
        body={
          pendingDelete && (ownersByCatalog.get(pendingDelete.id) ?? []).length
            ? `Se quitará también de: ${(ownersByCatalog.get(pendingDelete.id) ?? [])
                .map((o) => o.crawler.name)
                .join(", ")}.`
            : "Se eliminará del catálogo."
        }
        loading={busy}
        onCancel={() => {
          if (!busy) setPendingDelete(null);
        }}
        onConfirm={() => void deleteSkill()}
      />
    </div>
  );
}
