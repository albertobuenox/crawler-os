"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CatalogTable } from "@/components/dm/CatalogTable";
import { SpriteEntityModal, type EntityDraft } from "@/components/dm/SpriteEntityModal";
import { useCreateRequest } from "@/hooks/useDmDeepLink";
import { useDmCatalog } from "@/hooks/useDmCatalog";
import { refreshSessionResources, upsertResource } from "@/lib/catalog-write";
import { RARITY_COLORS } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/copy";
import type { Resource } from "@/lib/types";

export default function DMNpcsPage() {
  const { supabase, session, resources, setResources, error, setError } = useDmCatalog();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const npcs = useMemo(() => resources.filter((resource) => resource.kind === "npc"), [resources]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormError("");
    setOpen(true);
  }, []);
  useCreateRequest("npc", openCreate);

  const openEdit = useCallback((resource: Resource) => {
    setEditing(resource);
    setFormError("");
    setOpen(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId || npcs.length === 0) return;
    const found = npcs.find((item) => item.id === editId);
    if (found) openEdit(found);
    params.delete("edit");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [npcs, openEdit]);

  async function save(draft: EntityDraft) {
    if (!session) return;
    setFormError("");
    setBusy(true);
    const result = await upsertResource(supabase, session.id, editing?.id ?? null, {
      name: draft.name,
      kind: "npc",
      rarity: editing?.rarity ?? "common",
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
    setOpen(false);
    setEditing(null);
  }

  async function remove() {
    if (!pendingDelete) return;
    setBusy(true);
    const { error: deleteError } = await supabase.from("resources").delete().eq("id", pendingDelete.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setResources((current) => current.filter((item) => item.id !== pendingDelete.id));
    setPendingDelete(null);
    setOpen(false);
    setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">PNJs</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">Gente del piso. No son loot ni enemigos.</p>
        </div>
        <Button variant="energy" onClick={openCreate}>
          Nuevo PNJ
        </Button>
      </div>
      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <CatalogTable
        resources={npcs}
        empty="Ningún PNJ en esta sesión."
        tipsDisabled={open || !!pendingDelete}
        onEdit={openEdit}
        onDelete={setPendingDelete}
        columns={[
          { id: "description", label: "Descripción", cell: () => null },
          {
            id: "rarity",
            label: "Rareza",
            cell: (resource) => (
              <span style={{ color: RARITY_COLORS[resource.rarity] }}>{RARITY_LABEL[resource.rarity]}</span>
            ),
          },
        ]}
      />
      <SpriteEntityModal
        open={open}
        resource={editing}
        sessionId={session?.id ?? null}
        kind="npc"
        busy={busy}
        error={formError}
        onClose={() => {
          if (!busy) {
            setOpen(false);
            setEditing(null);
          }
        }}
        onSave={(draft) => void save(draft)}
        onDelete={editing ? () => setPendingDelete(editing) : undefined}
      />
      <ConfirmModal
        open={!!pendingDelete}
        title={`¿Borrar ${pendingDelete?.name ?? "este PNJ"}?`}
        body="Desaparece del catálogo. Las fichas de escena que lo usen se quedan huérfanas."
        loading={busy}
        onCancel={() => {
          if (!busy) setPendingDelete(null);
        }}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
