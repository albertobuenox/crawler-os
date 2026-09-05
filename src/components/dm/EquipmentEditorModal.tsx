"use client";

import { useEffect, useState } from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { BRAND } from "@/lib/copy";
import { resourceBlurb, resourceDescriptionLabel } from "@/lib/resources";
import { itemIsUnique, lootOriginLabel } from "@/lib/loot";
import {
  EQUIP_SLOT_LABEL,
  EQUIP_SLOT_OPTIONS,
  emptyBonus,
  parseEquipmentBonuses,
  resourceEquipSlot,
  type EquipSlotId,
  type EquipmentBonus,
} from "@/lib/equipment";
import type { Resource } from "@/lib/types";

export type EquipmentDraft = {
  name: string;
  description: string;
  system_copy: string;
  icon_url: string | null;
  is_unique: boolean;
  equip_slot: EquipSlotId;
  bonuses: EquipmentBonus[];
};

function draftFrom(resource: Resource | null): EquipmentDraft {
  return {
    name: resource?.name ?? "",
    description: resource?.description ?? "",
    system_copy: resource?.system_copy ?? "",
    icon_url: resource?.icon_url ?? null,
    is_unique: itemIsUnique(resource),
    equip_slot: resourceEquipSlot(resource) ?? "chest",
    bonuses: parseEquipmentBonuses(resource?.payload),
  };
}

export function EquipmentEditorForm({
  resource,
  sessionId,
  busy = false,
  error = "",
  cancelLabel = "Cancelar",
  onCancel,
  onSave,
  onDelete,
}: {
  resource: Resource | null;
  sessionId: string | null;
  busy?: boolean;
  error?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onSave: (draft: EquipmentDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<EquipmentDraft>(draftFrom(resource));
  const [localError, setLocalError] = useState("");
  const [spriteError, setSpriteError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setDraft(draftFrom(resource));
    setLocalError("");
    setSpriteError("");
    setUploading(false);
  }, [resource]);

  const shownError = localError || error;
  const origin = lootOriginLabel(resource);
  const previewBonuses = draft.bonuses.filter((bonus) => bonus.text.trim());

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

  function patchBonus(id: string, patch: Partial<EquipmentBonus>) {
    setDraft((current) => ({
      ...current,
      bonuses: current.bonuses.map((bonus) => (bonus.id === id ? { ...bonus, ...patch } : bonus)),
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setLocalError("Ponle un nombre al equipo.");
      return;
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      system_copy: draft.system_copy.trim(),
      bonuses: draft.bonuses
        .map((bonus) => ({ ...bonus, text: bonus.text.trim() }))
        .filter((bonus) => bonus.text),
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
            label="Se equipa en"
            value={draft.equip_slot}
            onChange={(e) => setDraft({ ...draft, equip_slot: e.target.value as EquipSlotId })}
            options={EQUIP_SLOT_OPTIONS}
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.55)] px-3 py-3">
          <input
            type="checkbox"
            checked={draft.is_unique}
            onChange={(e) => setDraft({ ...draft, is_unique: e.target.checked })}
            className="h-4 w-4 accent-[var(--gold-400)]"
          />
          <span className="flex items-center gap-2 text-sm text-[var(--text-1)]">
            <Star size={14} className="text-[var(--gold-400)]" fill="currentColor" />
            Único
          </span>
          <span className="text-xs text-[var(--text-3)]">
            Si se desequipa, desaparece para siempre.
          </span>
        </label>

        {origin ? (
          <p className="text-xs text-[var(--text-3)]">
            Origen: <span className="text-[var(--text-2)]">{origin}</span>
          </p>
        ) : null}

        <Textarea
          label="Descripción"
          placeholder="Qué es y cómo se ve. Sale al pasar el cursor y en la mochila."
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={5}
          className="min-h-[8rem]"
        />
        <Textarea
          label="Copy del Sistema"
          placeholder="Voz de BORANT CORP. Opcional."
          value={draft.system_copy}
          onChange={(e) => setDraft({ ...draft, system_copy: e.target.value })}
          rows={3}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-label">Bonificadores</p>
            <Button
              type="button"
              variant="neon"
              size="sm"
              onClick={() => setDraft((current) => ({ ...current, bonuses: [...current.bonuses, emptyBonus()] }))}
            >
              <Plus size={14} />
              Añadir
            </Button>
          </div>
          <p className="text-xs text-[var(--text-3)]">
            Texto libre. +1 de daño contundente, o “Al golpear duerme al enemigo”. Tantos como quieras.
          </p>
          {draft.bonuses.length === 0 ? (
            <p className="text-sm text-[var(--text-4)]">Ninguno. El hierro sin aura también vale.</p>
          ) : (
            <div className="space-y-2">
              {draft.bonuses.map((bonus, index) => (
                <div
                  key={bonus.id}
                  className="grid gap-2 rounded-xl border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.45)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                >
                  <Input
                    label={index === 0 ? "Efecto" : undefined}
                    value={bonus.text}
                    onChange={(e) => patchBonus(bonus.id, { text: e.target.value })}
                    placeholder="+1 de daño contundente"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Quitar bonificador"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        bonuses: current.bonuses.filter((item) => item.id !== bonus.id),
                      }))
                    }
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-label">Miniatura</p>
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
            {resource ? "Guardar" : "Crear equipo"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--stroke-glass)] px-3 py-5">
        <p className="text-label">Vista del crawler</p>
        <div className="w-24">
          <InventorySlot
            name={draft.name || "Sin nombre"}
            rarity="common"
            unique={draft.is_unique}
            iconUrl={draft.icon_url}
            detail={resourceBlurb({ description: draft.description, system_copy: draft.system_copy })}
            sourceLabel={origin}
            hideRarity
            showTooltip
          />
        </div>
        <p className="text-center text-[10px] uppercase tracking-[0.14em] text-[var(--cyan-400)]">
          {EQUIP_SLOT_LABEL[draft.equip_slot]}
        </p>
        <p className={`text-center text-xs ${draft.description.trim() ? "text-[var(--text-2)]" : "text-[var(--text-4)]"}`}>
          {resourceDescriptionLabel({ description: draft.description })}
        </p>
        {previewBonuses.length > 0 ? (
          <ul className="w-full space-y-1">
            {previewBonuses.map((bonus) => (
              <li key={bonus.id} className="text-[11px] leading-snug text-[var(--text-2)]">
                {bonus.text}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </form>
  );
}

export function EquipmentEditorModal({
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
  onSave: (draft: EquipmentDraft) => void;
  onDelete?: () => void;
}) {
  return (
    <Modal
      open={open}
      size="xl"
      eyebrow={`${BRAND} — EQUIPO`}
      title={resource ? `Editar ${resource.name}` : "Nuevo equipo"}
      subtitle="Slot, unicidad y bonificadores. El crawler lo verá en la mochila."
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {open ? (
        <EquipmentEditorForm
          resource={resource}
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
