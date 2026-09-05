"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { BRAND, kindOptions, rarityOptions } from "@/lib/copy";
import { resourceBlurb, resourceDescriptionLabel } from "@/lib/resources";
import type { Rarity, Resource, ResourceKind } from "@/lib/types";

const KINDS: ResourceKind[] = [
  "item", "achievement", "map", "monster", "npc", "box", "buff", "debuff", "quest", "floor", "skill_template",
];

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "celestial"];

export type ResourceDraft = {
  name: string;
  kind: ResourceKind;
  rarity: Rarity;
  description: string;
  system_copy: string;
  icon_url: string | null;
};

function draftFrom(resource: Resource | null): ResourceDraft {
  return {
    name: resource?.name ?? "",
    kind: resource?.kind ?? "item",
    rarity: resource?.rarity ?? "common",
    description: resource?.description ?? "",
    system_copy: resource?.system_copy ?? "",
    icon_url: resource?.icon_url ?? null,
  };
}

export function ResourceEditorModal({
  open,
  resource,
  sessionId,
  busy = false,
  error = "",
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  resource: Resource | null;
  sessionId: string | null;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: ResourceDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<ResourceDraft>(draftFrom(resource));
  const [localError, setLocalError] = useState("");
  const [spriteError, setSpriteError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFrom(resource));
    setLocalError("");
    setSpriteError("");
    setUploading(false);
  }, [open, resource]);

  const shownError = localError || error;
  const preview: Pick<Resource, "name" | "rarity" | "description" | "system_copy" | "icon_url"> = {
    name: draft.name || "Sin nombre",
    rarity: draft.rarity,
    description: draft.description,
    system_copy: draft.system_copy,
    icon_url: draft.icon_url,
  };

  async function uploadSprite(file: File) {
    if (!sessionId) return;
    setSpriteError("");
    setUploading(true);
    const body = new FormData();
    body.set("file", file);
    body.set("kind", "resource");
    body.set("session_id", sessionId);
    const res = await fetch("/api/dm/scene-assets", { method: "POST", body });
    const json = (await res.json()) as { url?: string; error?: string };
    setUploading(false);
    if (!res.ok || !json.url) {
      setSpriteError(json.error || "El Sistema rechazó el sprite.");
      return;
    }
    setDraft((current) => ({ ...current, icon_url: json.url ?? null }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setLocalError("Ponle un nombre al recurso.");
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      system_copy: draft.system_copy.trim(),
    });
  }

  const showSprite = draft.kind === "monster" || draft.kind === "map" || draft.kind === "npc";

  return (
    <Modal
      open={open}
      size="xl"
      eyebrow={`${BRAND} — RECURSOS`}
      title={resource ? `Editar ${resource.name}` : "Nuevo recurso"}
      subtitle="Guarda los cambios, o bórralo si ya no sirve."
      onClose={() => {
        if (!busy && !uploading) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
            <Input
              label="Nombre"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
            <Select
              label="Tipo"
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as ResourceKind })}
              options={kindOptions(KINDS)}
            />
            <Select
              label="Rareza"
              value={draft.rarity}
              onChange={(e) => setDraft({ ...draft, rarity: e.target.value as Rarity })}
              options={rarityOptions(RARITIES)}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Textarea
              label="Descripción"
              placeholder="Qué es el recurso. Se ve en la tabla y al pasar el cursor."
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={10}
              className="min-h-[14rem]"
            />
            <Textarea
              label="Copy del Sistema"
              placeholder="Voz de BORANT CORP. Opcional. Sale en revelaciones y cinemáticas."
              value={draft.system_copy}
              onChange={(e) => setDraft({ ...draft, system_copy: e.target.value })}
              rows={10}
              className="min-h-[14rem]"
            />
          </div>
          {showSprite && (
            <div className="space-y-2">
              <p className="text-label">Sprite</p>
              <div className="flex items-center gap-3">
                <span className="h-16 w-16 overflow-hidden rounded-[12px] border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.8)]">
                  {draft.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.icon_url} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <label className="btn-neon inline-flex h-10 cursor-pointer items-center px-4 text-sm">
                  {draft.icon_url ? "Cambiar sprite" : "Subir sprite"}
                  <input
                    type="file"
                    accept="image/webp,image/png,image/jpeg,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void uploadSprite(file);
                    }}
                  />
                </label>
              </div>
              {spriteError && <p className="text-xs text-[var(--danger)]">{spriteError}</p>}
            </div>
          )}
          {shownError && <p className="text-sm text-[var(--danger)]">{shownError}</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={busy || uploading} onClick={onClose}>
              Cancelar
            </Button>
            {resource && onDelete ? (
              <Button type="button" variant="danger" disabled={busy || uploading} onClick={onDelete}>
                Borrar
              </Button>
            ) : null}
            <Button type="submit" variant="session" loading={busy || uploading}>
              {resource ? "Guardar" : "Crear recurso"}
            </Button>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--stroke-glass)] px-3 py-5">
          <p className="text-label">Vista del crawler</p>
          <div className="w-24">
            <InventorySlot
              name={preview.name}
              rarity={preview.rarity}
              iconUrl={preview.icon_url}
              detail={resourceBlurb(preview)}
              showTooltip
            />
          </div>
          <p className={`text-center text-xs ${draft.description.trim() ? "text-[var(--text-2)]" : "text-[var(--text-4)]"}`}>
            {resourceDescriptionLabel(preview)}
          </p>
          {draft.system_copy.trim() ? (
            <p className="text-center text-xs italic text-[var(--text-3)]">{draft.system_copy}</p>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
