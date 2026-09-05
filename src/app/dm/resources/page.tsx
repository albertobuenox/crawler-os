"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CatalogTable } from "@/components/dm/CatalogTable";
import { GiveToCrawlerModal } from "@/components/dm/GiveToCrawlerModal";
import { ResourceEditorModal, type ResourceDraft } from "@/components/dm/ResourceEditorModal";
import { useCreateRequest } from "@/hooks/useDmDeepLink";
import { useDmCatalog } from "@/hooks/useDmCatalog";
import { catalogHref, leftoverResourceKinds } from "@/lib/objects";
import { refreshSessionResources, upsertResource } from "@/lib/catalog-write";
import { KIND_LABEL, RARITY_LABEL } from "@/lib/copy";
import { RARITY_COLORS } from "@/lib/types";
import { resourceKindLabel } from "@/lib/resources";
import type { Resource } from "@/lib/types";

export default function DMResourcesPage() {
  const router = useRouter();
  const { supabase, session, resources, setResources, crawlers, error, setError } = useDmCatalog();
  const [filter, setFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const [giving, setGiving] = useState<Resource | null>(null);

  const leftover = useMemo(
    () => resources.filter((resource) => leftoverResourceKinds.includes(resource.kind)),
    [resources],
  );
  const filtered = filter === "all" ? leftover : leftover.filter((resource) => resource.kind === filter);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
  }, []);
  useCreateRequest("resource", openCreate);

  const openEdit = useCallback((resource: Resource) => {
    if (!leftoverResourceKinds.includes(resource.kind)) {
      router.replace(catalogHref(resource));
      return;
    }
    setEditing(resource);
    setFormError("");
    setFormOpen(true);
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    const createKind = params.get("new");
    if (createKind === "equipment") {
      router.replace("/dm/objects?new=equipment");
      return;
    }
    if (!editId || resources.length === 0) return;
    const found = resources.find((item) => item.id === editId);
    if (!found) return;
    if (!leftoverResourceKinds.includes(found.kind)) {
      router.replace(catalogHref(found));
      return;
    }
    openEdit(found);
    params.delete("edit");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [openEdit, resources, router]);

  async function saveResource(draft: ResourceDraft) {
    if (!session) return;
    setFormError("");
    setBusy(true);
    const result = await upsertResource(supabase, session.id, editing?.id ?? null, {
      name: draft.name,
      kind: draft.kind,
      rarity: draft.rarity,
      description: draft.description || null,
      system_copy: draft.system_copy || null,
      icon_url: draft.icon_url,
      payload: editing?.payload ?? {},
    });
    setBusy(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    const { data } = await refreshSessionResources(supabase, session.id);
    setResources(data);
    setFormOpen(false);
    setEditing(null);
  }

  async function deleteResource() {
    if (!pendingDelete) return;
    setError("");
    setBusy(true);
    const { error: deleteError } = await supabase.from("resources").delete().eq("id", pendingDelete.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setResources((current) => current.filter((item) => item.id !== pendingDelete.id));
    setPendingDelete(null);
    setFormOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Recursos</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Mapas, logros, misiones y el resto. Objetos, PNJs y mobs tienen su propio menú.
          </p>
        </div>
        <Button variant="energy" onClick={openCreate}>
          Nuevo recurso
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "neon" : "ghost"} size="sm" onClick={() => setFilter("all")}>
          Todo
        </Button>
        {leftoverResourceKinds.map((kind) => (
          <Button key={kind} variant={filter === kind ? "neon" : "ghost"} size="sm" onClick={() => setFilter(kind)}>
            {KIND_LABEL[kind]}
          </Button>
        ))}
      </div>

      <CatalogTable
        resources={filtered}
        empty="No hay recursos en este filtro."
        tipsDisabled={formOpen || !!pendingDelete || !!giving}
        onEdit={openEdit}
        onDelete={setPendingDelete}
        onGrant={setGiving}
        columns={[
          { id: "description", label: "Descripción", cell: () => null },
          {
            id: "type",
            label: "Tipo",
            cell: (resource) => <span className="text-[var(--text-3)]">{resourceKindLabel(resource)}</span>,
          },
          {
            id: "rarity",
            label: "Rareza",
            cell: (resource) => (
              <span style={{ color: RARITY_COLORS[resource.rarity] }}>{RARITY_LABEL[resource.rarity]}</span>
            ),
          },
        ]}
      />

      <ResourceEditorModal
        open={formOpen}
        resource={editing}
        sessionId={session?.id ?? null}
        busy={busy}
        error={formError}
        onClose={() => {
          if (!busy) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
        onSave={(draft) => void saveResource(draft)}
        onDelete={editing ? () => setPendingDelete(editing) : undefined}
      />

      <GiveToCrawlerModal
        open={!!giving}
        sessionId={session?.id ?? null}
        resource={giving}
        resources={leftover}
        crawlers={crawlers}
        onClose={() => setGiving(null)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title={`¿Borrar ${pendingDelete?.name ?? "este recurso"}?`}
        body="También se quitará de inventarios, cajas y logros que lo usen."
        loading={busy}
        onCancel={() => {
          if (!busy) setPendingDelete(null);
        }}
        onConfirm={() => void deleteResource()}
      />
    </div>
  );
}
