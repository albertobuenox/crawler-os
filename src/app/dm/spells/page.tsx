"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { AssignSpellModal } from "@/components/dm/AssignSpellModal";
import { CreateSpellModal } from "@/components/dm/CreateSpellModal";
import type { Crawler, SkillKind, Spell, SpellCatalogEntry, StatKey } from "@/lib/types";
import { SKILL_KIND_LABEL, skillKindLabel } from "@/lib/copy";
import { castSession } from "@/lib/utils";
import { clampSpellRank, SPELL_RANK_MIN, spellSlugFromName } from "@/lib/spells";
import { SpellThumb } from "@/components/hud/SpellThumb";
import { useCreateRequest } from "@/hooks/useDmDeepLink";
import { cn } from "@/lib/utils";

const KIND_PILL: Record<SkillKind, string> = {
  ataque: "text-[var(--orange-400)]",
  defensa: "text-[var(--cyan-400)]",
  apoyo: "text-[var(--gold-400)]",
  destreza: "text-[var(--magenta-400)]",
};

export default function DMSpellsPage() {
  const supabase = createClient();
  const [catalog, setCatalog] = useState<SpellCatalogEntry[]>([]);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [assignments, setAssignments] = useState<Spell[]>([]);
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SpellCatalogEntry | null>(null);
  const [assigning, setAssigning] = useState<SpellCatalogEntry | null>(null);
  const [assignIds, setAssignIds] = useState<string[]>([]);
  const [rank, setRank] = useState(SPELL_RANK_MIN);
  const [linkedStat, setLinkedStat] = useState<StatKey>("int");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [assignError, setAssignError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SpellCatalogEntry | null>(null);

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

    const { data: cat } = await supabase.from("spell_catalog").select("*").order("name");
    setCatalog((cat as SpellCatalogEntry[]) ?? []);

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

    const { data: spellRows } = await supabase
      .from("spells")
      .select("id, crawler_id, catalog_id, name, rank")
      .in(
        "crawler_id",
        list.map((c) => c.id)
      );
    setAssignments((spellRows as Spell[]) ?? []);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((s) => {
      const kind = skillKindLabel(s.kind);
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q) ||
        kind.toLowerCase().includes(q)
      );
    });
  }, [catalog, query]);

  const ownersByCatalog = useMemo(() => {
    const map = new Map<string, { spellId: string; crawler: Crawler }[]>();
    for (const spell of assignments) {
      if (!spell.catalog_id) continue;
      const crawler = crawlers.find((c) => c.id === spell.crawler_id);
      if (!crawler) continue;
      const list = map.get(spell.catalog_id) ?? [];
      list.push({ spellId: spell.id, crawler });
      map.set(spell.catalog_id, list);
    }
    return map;
  }, [assignments, crawlers]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
    setAssigning(null);
  }, []);
  useCreateRequest("spell", openCreate);

  function openEdit(entry: SpellCatalogEntry) {
    setEditing(entry);
    setFormError("");
    setFormOpen(true);
    setAssigning(null);
  }

  function openAssign(entry: SpellCatalogEntry) {
    setAssigning(entry);
    setAssignIds([]);
    setRank(SPELL_RANK_MIN);
    setLinkedStat("int");
    setAssignError("");
    setFormOpen(false);
  }

  function uniqueSlug(name: string, exceptId?: string) {
    const base = spellSlugFromName(name);
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
    thumb?: File | null;
  }) {
    setFormError("");
    setBusy(true);
    const form = new FormData();
    form.set("name", payload.name);
    form.set("description", payload.description);
    form.set("kind", payload.kind);
    if (editing) form.set("id", editing.id);
    else form.set("slug", uniqueSlug(payload.name));
    if (payload.thumb) form.set("thumb", payload.thumb);

    const res = await fetch("/api/dm/spell-catalog", {
      method: editing ? "PATCH" : "POST",
      body: form,
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setFormError(body.error || "No se pudo guardar el spell.");
      return;
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  }

  async function deleteSpell() {
    if (!pendingDelete) return;
    const owners = ownersByCatalog.get(pendingDelete.id) ?? [];
    setError("");
    setBusy(true);
    if (owners.length) {
      const { error: unassignError } = await supabase
        .from("spells")
        .delete()
        .in(
          "id",
          owners.map((o) => o.spellId)
        );
      if (unassignError) {
        setBusy(false);
        setError(unassignError.message);
        return;
      }
    }
    const res = await fetch(`/api/dm/spell-catalog?id=${encodeURIComponent(pendingDelete.id)}`, {
      method: "DELETE",
    });
    const body = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(body.error || "No se pudo borrar el spell.");
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

  async function assignSpell(e: React.FormEvent) {
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
      setAssignError("Esos crawlers ya tienen este spell.");
      return;
    }

    setBusy(true);
    const { error: insertError } = await supabase.from("spells").insert(
      targets.map((crawlerId) => ({
        crawler_id: crawlerId,
        catalog_id: assigning.id,
        name: assigning.name,
        rank: clampSpellRank(rank),
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

  async function unassign(spellId: string) {
    setError("");
    const { error: deleteError } = await supabase.from("spells").delete().eq("id", spellId);
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
          <h2 className="font-display text-xl">Spells</h2>
          <p className="text-xs text-[var(--text-cyan)]">Catálogo de conjuros — crear, editar, borrar o asignar</p>
        </div>
        <Button variant="energy" onClick={openCreate}>
          Nuevo spell
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <GlassPanel
        title="Tabla de spells"
        subtitle={`${catalog.length} en el catálogo`}
        action={
          <Input
            id="spell-search"
            placeholder="Buscar nombre o tipo…"
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
                <th className="p-3">Nombre</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Crawlers</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const owners = ownersByCatalog.get(s.id) ?? [];
                const kind = (s.kind ?? "ataque") as SkillKind;
                return (
                  <tr key={s.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.04)]">
                    <td className="p-3">
                      <SpellThumb slug={s.slug} thumbUrl={s.thumb_url} size="sm" tip={s} />
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
                    <td className="p-3">
                      {owners.length === 0 ? (
                        <span className="text-[var(--text-4)]">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {owners.map((o) => (
                            <button
                              key={o.spellId}
                              type="button"
                              title={`Quitar de ${o.crawler.name}`}
                              onClick={() => void unassign(o.spellId)}
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
                  <td colSpan={5} className="p-6 text-center text-[var(--text-3)]">
                    No hay spells que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <CreateSpellModal
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

      <AssignSpellModal
        open={!!assigning}
        spell={assigning}
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
        onSubmit={(e) => void assignSpell(e)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title={`¿Borrar ${pendingDelete?.name ?? "este spell"}?`}
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
        onConfirm={() => void deleteSpell()}
      />
    </div>
  );
}
