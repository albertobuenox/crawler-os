"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ResourceEditorModal, type ResourceDraft } from "@/components/dm/ResourceEditorModal";
import { ResourceHoverTip } from "@/components/hud/ResourceHoverTip";
import type { GameSession, Resource, ResourceKind } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { RARITY_COLORS } from "@/lib/types";
import { KIND_LABEL, RARITY_LABEL } from "@/lib/copy";
import { resourceDescriptionLabel } from "@/lib/resources";
import { useCreateRequest } from "@/hooks/useDmDeepLink";

const KINDS: ResourceKind[] = [
  "item", "achievement", "map", "monster", "npc", "box", "buff", "debuff", "quest", "floor", "skill_template",
];

export default function DMResourcesPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormError("");
    setFormOpen(true);
  }, []);
  useCreateRequest("resource", openCreate);

  const openEdit = useCallback((resource: Resource) => {
    setEditing(resource);
    setFormError("");
    setFormOpen(true);
  }, []);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId || resources.length === 0) return;
    const found = resources.find((item) => item.id === editId);
    if (found) openEdit(found);
    params.delete("edit");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [openEdit, resources]);

  async function load() {
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
    setSession(sess ?? null);
    if (sess) {
      const { data } = await supabase.from("resources").select("*").eq("session_id", sess.id).order("created_at", { ascending: false });
      setResources((data as Resource[]) ?? []);
    }
  }

  async function saveResource(draft: ResourceDraft) {
    if (!session) return;
    setFormError("");
    setBusy(true);
    const payload = {
      name: draft.name,
      kind: draft.kind,
      rarity: draft.rarity,
      description: draft.description || null,
      system_copy: draft.system_copy || null,
      icon_url: draft.icon_url,
    };
    const result = editing
      ? await supabase.from("resources").update(payload).eq("id", editing.id).select("*").single()
      : await supabase.from("resources").insert({ session_id: session.id, ...payload, payload: {} }).select("*").single();
    setBusy(false);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    const saved = result.data as Resource;
    setResources((current) => {
      if (editing) return current.map((item) => (item.id === saved.id ? saved : item));
      return [saved, ...current];
    });
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

  const filtered = filter === "all" ? resources : resources.filter((r) => r.kind === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <h2 className="font-display text-xl">Recursos</h2>
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
        <Button variant={filter === "all" ? "neon" : "ghost"} size="sm" onClick={() => setFilter("all")}>Todo</Button>
        {KINDS.map((k) => (
          <Button key={k} variant={filter === k ? "neon" : "ghost"} size="sm" onClick={() => setFilter(k)}>{KIND_LABEL[k]}</Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl well">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--stroke-glass)] text-left text-label">
              <th className="p-3">Nombre</th>
              <th className="p-3">Descripción</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Rareza</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const description = resourceDescriptionLabel(r);
              const empty = !r.description?.trim();
              return (
                <ResourceHoverTip key={r.id} resource={r} disabled={formOpen}>
                  <tr className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.04)]">
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="text-left font-medium text-[var(--text-1)] hover:text-[var(--cyan-400)] hover:underline"
                      >
                        {r.name}
                      </button>
                    </td>
                    <td className="p-3">
                      <span className={`block max-w-xs truncate ${empty ? "text-[var(--text-4)]" : "text-[var(--text-3)]"}`}>
                        {description}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-3)]">{KIND_LABEL[r.kind]}</td>
                    <td className="p-3" style={{ color: RARITY_COLORS[r.rarity] }}>{RARITY_LABEL[r.rarity]}</td>
                  </tr>
                </ResourceHoverTip>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-[var(--text-3)]">
                  No hay recursos en este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
