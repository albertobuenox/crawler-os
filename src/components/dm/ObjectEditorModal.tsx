"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { ThumbPicker } from "@/components/dm/ThumbPicker";
import { BRAND } from "@/lib/copy";
import { ITEM_CATEGORY_LABEL } from "@/lib/objects";
import { resourceBlurb, resourceDescriptionLabel } from "@/lib/resources";
import { lootOriginLabel } from "@/lib/loot";
import { defaultObjectArt, objectPresetsForCategory, retargetObjectArt } from "@/lib/item-art";
import type { ItemCategory, Resource } from "@/lib/types";

export type ObjectDraft = {
  name: string;
  category: "consumable" | "misc";
  description: string;
  system_copy: string;
  icon_url: string | null;
};

function draftFrom(resource: Resource | null, category: "consumable" | "misc"): ObjectDraft {
  return {
    name: resource?.name ?? "",
    category,
    description: resource?.description ?? "",
    system_copy: resource?.system_copy ?? "",
    icon_url: resource?.icon_url ?? defaultObjectArt(category),
  };
}

export function ObjectEditorForm({
  resource,
  category,
  sessionId,
  busy = false,
  error = "",
  lockCategory = false,
  cancelLabel = "Cancelar",
  onCancel,
  onSave,
  onDelete,
}: {
  resource: Resource | null;
  category: "consumable" | "misc";
  sessionId: string | null;
  busy?: boolean;
  error?: string;
  lockCategory?: boolean;
  cancelLabel?: string;
  onCancel: () => void;
  onSave: (draft: ObjectDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<ObjectDraft>(draftFrom(resource, category));
  const [localError, setLocalError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(draftFrom(resource, category));
    setLocalError("");
    setUploading(false);
  }, [resource, category]);

  const shownError = localError || error;
  const origin = lootOriginLabel(resource);
  const label = ITEM_CATEGORY_LABEL[category as ItemCategory];
  const artOptions = objectPresetsForCategory(draft.category);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setLocalError(`Ponle un nombre al ${label.toLowerCase()}.`);
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
    <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nombre"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            required
          />
          <Select
            label="Clase"
            value={draft.category}
            onChange={(e) => {
              const next = e.target.value as "consumable" | "misc";
              setDraft((current) => ({
                ...current,
                category: next,
                icon_url: retargetObjectArt(current.icon_url, next),
              }));
            }}
            disabled={lockCategory}
            options={[
              { value: "consumable", label: ITEM_CATEGORY_LABEL.consumable },
              { value: "misc", label: ITEM_CATEGORY_LABEL.misc },
            ]}
          />
        </div>
        {origin ? (
          <p className="text-xs text-[var(--text-3)]">
            Origen: <span className="text-[var(--text-2)]">{origin}</span>
          </p>
        ) : null}
        <Textarea
          label="Descripción"
          placeholder="Qué es y para qué sirve."
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={6}
          className="min-h-[10rem]"
        />
        <Textarea
          label="Copy del Sistema"
          placeholder="Voz de BORANT CORP. Opcional."
          value={draft.system_copy}
          onChange={(e) => setDraft({ ...draft, system_copy: e.target.value })}
          rows={3}
        />
        <ThumbPicker
          value={draft.icon_url}
          options={artOptions}
          sessionId={sessionId}
          disabled={busy}
          hint="O elige una de su tipo."
          onChange={(icon_url) => setDraft((current) => ({ ...current, icon_url }))}
          onBusy={setUploading}
        />
        {shownError && <p className="text-sm text-[var(--danger)]">{shownError}</p>}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" disabled={busy || uploading} onClick={onCancel}>
            {cancelLabel}
          </Button>
          {resource && onDelete ? (
            <Button type="button" variant="danger" disabled={busy || uploading} onClick={onDelete}>
              Borrar
            </Button>
          ) : null}
          <Button type="submit" variant="session" loading={busy || uploading}>
            {resource ? "Guardar" : `Crear ${label.toLowerCase()}`}
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--stroke-glass)] px-3 py-5">
        <p className="text-label">Vista del crawler</p>
        <div className="w-24">
          <InventorySlot
            name={draft.name || "Sin nombre"}
            rarity="common"
            iconUrl={draft.icon_url}
            detail={resourceBlurb({ description: draft.description, system_copy: draft.system_copy })}
            sourceLabel={origin}
            hideRarity
            showTooltip
          />
        </div>
        <p className="text-center text-[10px] uppercase tracking-[0.14em] text-[var(--cyan-400)]">
          {ITEM_CATEGORY_LABEL[draft.category]}
        </p>
        <p className={`text-center text-xs ${draft.description.trim() ? "text-[var(--text-2)]" : "text-[var(--text-4)]"}`}>
          {resourceDescriptionLabel({ description: draft.description })}
        </p>
      </div>
    </form>
  );
}

export function ObjectEditorModal({
  open,
  resource,
  category,
  sessionId,
  busy = false,
  error = "",
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  resource: Resource | null;
  category: "consumable" | "misc";
  sessionId: string | null;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (draft: ObjectDraft) => void;
  onDelete?: () => void;
}) {
  const label = ITEM_CATEGORY_LABEL[category as ItemCategory];

  return (
    <Modal
      open={open}
      size="xl"
      eyebrow={`${BRAND} — OBJETOS`}
      title={resource ? `Editar ${resource.name}` : `Nuevo ${label.toLowerCase()}`}
      subtitle={
        category === "consumable"
          ? "Se usa y se gasta. Pociones, comida, cargas."
          : "No se equipa ni se consume. Se porta, se entrega o se rompe."
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {open ? (
        <ObjectEditorForm
          resource={resource}
          category={category}
          sessionId={sessionId}
          busy={busy}
          error={error}
          onCancel={onClose}
          onSave={onSave}
          onDelete={onDelete}
        />
      ) : null}
    </Modal>
  );
}
