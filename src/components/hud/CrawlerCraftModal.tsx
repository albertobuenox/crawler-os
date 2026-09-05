"use client";

import { useState } from "react";
import { Package, Shield } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { EquipmentEditorForm, type EquipmentDraft } from "@/components/dm/EquipmentEditorModal";
import { ObjectEditorForm, type ObjectDraft } from "@/components/dm/ObjectEditorModal";
import { BRAND } from "@/lib/copy";
import { ITEM_CATEGORY_LABEL } from "@/lib/objects";

type CraftKind = "equipment" | "consumable" | "misc";

export function CrawlerCraftModal({
  open,
  sessionId,
  onClose,
  onCreated,
}: {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [kind, setKind] = useState<CraftKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setKind(null);
    setBusy(false);
    setError("");
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function submit(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/crawler/craft-item", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "El Sistema rechazó el objeto.");
      return;
    }
    reset();
    onCreated();
  }

  function saveEquipment(draft: EquipmentDraft) {
    void submit({
      kind: "equipment",
      name: draft.name,
      description: draft.description,
      system_copy: draft.system_copy,
      icon_url: draft.icon_url,
      equip_slot: draft.equip_slot,
      is_unique: draft.is_unique,
      bonuses: draft.bonuses,
    });
  }

  function saveObject(draft: ObjectDraft) {
    void submit({
      kind: draft.category,
      name: draft.name,
      description: draft.description,
      system_copy: draft.system_copy,
      icon_url: draft.icon_url,
    });
  }

  return (
    <Modal
      open={open}
      size={kind ? "xl" : "md"}
      eyebrow={`${BRAND} — PRUEBA`}
      title={kind ? `Nuevo ${ITEM_CATEGORY_LABEL[kind].toLowerCase()}` : "Crear objeto"}
      subtitle="Se queda en el hueco que has pulsado. El Master te lo agradece. O no."
      onClose={handleClose}
    >
      {!kind ? (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button type="button" variant="neon" onClick={() => setKind("equipment")}>
              <Shield size={16} strokeWidth={1.75} />
              Equipo
            </Button>
            <Button type="button" variant="neon" onClick={() => setKind("consumable")}>
              <Package size={16} strokeWidth={1.75} />
              Consumible
            </Button>
            <Button type="button" variant="neon" onClick={() => setKind("misc")}>
              Misceláneo
            </Button>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : kind === "equipment" ? (
        <EquipmentEditorForm
          resource={null}
          sessionId={sessionId}
          busy={busy}
          error={error}
          cancelLabel="Atrás"
          onCancel={() => {
            if (!busy) {
              setKind(null);
              setError("");
            }
          }}
          onSave={saveEquipment}
        />
      ) : (
        <ObjectEditorForm
          resource={null}
          category={kind}
          sessionId={sessionId}
          busy={busy}
          error={error}
          lockCategory
          cancelLabel="Atrás"
          onCancel={() => {
            if (!busy) {
              setKind(null);
              setError("");
            }
          }}
          onSave={saveObject}
        />
      )}
    </Modal>
  );
}
