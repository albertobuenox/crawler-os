"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { BRAND } from "@/lib/copy";
import { resourceDescriptionLabel } from "@/lib/resources";
import type { Resource } from "@/lib/types";

export type EntityDraft = {
  name: string;
  description: string;
  system_copy: string;
  icon_url: string | null;
};

function draftFrom(resource: Resource | null): EntityDraft {
  return {
    name: resource?.name ?? "",
    description: resource?.description ?? "",
    system_copy: resource?.system_copy ?? "",
    icon_url: resource?.icon_url ?? null,
  };
}

export function SpriteEntityModal({
  open,
  resource,
  sessionId,
  kind,
  busy = false,
  error = "",
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  resource: Resource | null;
  sessionId: string | null;
  kind: "npc" | "monster";
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: EntityDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<EntityDraft>(draftFrom(resource));
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

  const isNpc = kind === "npc";
  const noun = isNpc ? "PNJ" : "mob";

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
      setLocalError(`Ponle un nombre al ${noun}.`);
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      system_copy: draft.system_copy.trim(),
    });
  }

  return (
    <Modal
      open={open}
      size="lg"
      eyebrow={`${BRAND} — ${isNpc ? "PNJ" : "MOBS"}`}
      title={resource ? `Editar ${resource.name}` : isNpc ? "Nuevo PNJ" : "Nuevo mob"}
      subtitle={isNpc ? "Gente que habla. No sale del pasillo a morder." : "Enemigos del catálogo. Luego los pones en Escena."}
      onClose={() => {
        if (!busy && !uploading) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          required
        />
        <Textarea
          label="Descripción"
          placeholder={isNpc ? "Quién es y qué quiere." : "Qué es y cómo mata."}
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={5}
        />
        <Textarea
          label="Copy del Sistema"
          placeholder="Voz de BORANT CORP. Opcional."
          value={draft.system_copy}
          onChange={(e) => setDraft({ ...draft, system_copy: e.target.value })}
          rows={3}
        />
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
              {draft.icon_url ? "Cambiar imagen" : "Subir imagen"}
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
        {(localError || error) && <p className="text-sm text-[var(--danger)]">{localError || error}</p>}
        <p className={`text-xs ${draft.description.trim() ? "text-[var(--text-3)]" : "text-[var(--text-4)]"}`}>
          {resourceDescriptionLabel({ description: draft.description })}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy || uploading} onClick={onClose}>
            Cancelar
          </Button>
          {resource && onDelete ? (
            <Button type="button" variant="danger" disabled={busy || uploading} onClick={onDelete}>
              Borrar
            </Button>
          ) : null}
          <Button type="submit" variant="session" loading={busy || uploading}>
            {resource ? "Guardar" : isNpc ? "Crear PNJ" : "Crear mob"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
