"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Hexagon, Library, Package, Plus, Shield, Sparkles, Star, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { InventorySlot } from "@/components/hud/InventorySlot";
import { ResourceKindMark } from "@/components/hud/ResourceKindMark";
import { EquipmentEditorForm, type EquipmentDraft } from "@/components/dm/EquipmentEditorModal";
import { ObjectEditorForm, type ObjectDraft } from "@/components/dm/ObjectEditorModal";
import { BRAND } from "@/lib/copy";
import { resourceThumbUrl } from "@/lib/item-art";
import { ITEM_CATEGORY_LABEL, objectTypeLabel } from "@/lib/objects";
import { itemIsUnique, lootBoxRarityOptions, lootFloorOptions } from "@/lib/loot";
import type { LootBoxRarity, Resource } from "@/lib/types";

export type LootBoxDraft = {
  name: string;
  loot_rarity: LootBoxRarity;
  loot_floor: number;
  icon_url: string | null;
  content_ids: string[];
};

type WizardStep = "closed" | "source" | "created" | "kind" | "equipment" | "consumable" | "misc";

function ChoiceCard({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.55)] px-4 py-3 text-left transition-colors hover:border-[var(--stroke-cyan)] hover:bg-[rgba(0,212,255,0.06)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] text-[var(--cyan-400)]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-[var(--text-1)]">{label}</span>
        <span className="mt-0.5 block text-xs text-[var(--text-3)]">{hint}</span>
      </span>
    </button>
  );
}

export function LootBoxEditorModal({
  open,
  resource,
  sessionId,
  catalogItems,
  busy = false,
  error = "",
  itemBusy = false,
  itemError = "",
  onClose,
  onSave,
  onDelete,
  onCreateEquipment,
  onCreateObject,
  pendingContentId,
}: {
  open: boolean;
  resource: Resource | null;
  sessionId: string | null;
  catalogItems: Resource[];
  busy?: boolean;
  error?: string;
  itemBusy?: boolean;
  itemError?: string;
  onClose: () => void;
  onSave: (draft: LootBoxDraft) => void;
  onDelete?: () => void;
  onCreateEquipment: (
    draft: EquipmentDraft,
    bind: { rarity: LootBoxRarity; floor: number },
  ) => Promise<boolean>;
  onCreateObject: (
    draft: ObjectDraft,
    bind: { rarity: LootBoxRarity; floor: number },
  ) => Promise<boolean>;
  pendingContentId?: string | null;
}) {
  const [draft, setDraft] = useState<LootBoxDraft>({
    name: "",
    loot_rarity: "bronze",
    loot_floor: 1,
    icon_url: null,
    content_ids: [],
  });
  const [localError, setLocalError] = useState("");
  const [spriteError, setSpriteError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<WizardStep>("closed");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: resource?.name ?? "",
      loot_rarity: resource?.loot_rarity ?? "bronze",
      loot_floor: resource?.loot_floor ?? 1,
      icon_url: resource?.icon_url ?? null,
      content_ids: Array.isArray(resource?.payload?.contents)
        ? (resource?.payload?.contents as Array<string | { resource_id?: string }>)
            .map((entry) => (typeof entry === "string" ? entry : entry.resource_id ?? ""))
            .filter(Boolean)
        : [],
    });
    setLocalError("");
    setSpriteError("");
    setUploading(false);
    setStep("closed");
    setQuery("");
  }, [open, resource]);

  useEffect(() => {
    if (!pendingContentId) return;
    setDraft((current) =>
      current.content_ids.includes(pendingContentId)
        ? current
        : { ...current, content_ids: [...current.content_ids, pendingContentId] },
    );
  }, [pendingContentId]);

  const selected = useMemo(
    () => draft.content_ids.map((id) => catalogItems.find((item) => item.id === id)).filter(Boolean) as Resource[],
    [catalogItems, draft.content_ids],
  );
  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalogItems.filter((item) => {
      if (draft.content_ids.includes(item.id)) return false;
      if (!needle) return true;
      return item.name.toLowerCase().includes(needle) || objectTypeLabel(item).toLowerCase().includes(needle);
    });
  }, [catalogItems, draft.content_ids, query]);

  const wizardOpen = step !== "closed";
  const formStep = step === "equipment" || step === "consumable" || step === "misc";
  const bind = { rarity: draft.loot_rarity, floor: draft.loot_floor };

  const wizardCopy = {
    source: {
      title: "Añadir contenido",
      subtitle: "Elige si entra un objeto ya creado o uno nuevo. Cada elección abre el siguiente paso.",
    },
    created: {
      title: "Objeto creado",
      subtitle: "Busca en el catálogo. Al elegir uno, entra en la caja.",
    },
    kind: {
      title: "Crear objeto",
      subtitle: "Equipo, consumible o misceláneo. El siguiente paso es el mismo editor que usas fuera de la caja.",
    },
    equipment: {
      title: "Nuevo equipo",
      subtitle: "Slot, unicidad y bonificadores. El crawler lo verá en la mochila.",
    },
    consumable: {
      title: "Nuevo consumible",
      subtitle: "Se usa y se gasta. Pociones, comida, cargas.",
    },
    misc: {
      title: "Nuevo misceláneo",
      subtitle: "No se equipa ni se consume. Se porta, se entrega o se rompe.",
    },
  } as const;

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

  function closeWizard() {
    if (itemBusy) return;
    setStep("closed");
    setQuery("");
  }

  function addItem(id: string) {
    setDraft((current) => ({
      ...current,
      content_ids: current.content_ids.includes(id) ? current.content_ids : [...current.content_ids, id],
    }));
    closeWizard();
  }

  function removeItem(id: string) {
    setDraft((current) => ({
      ...current,
      content_ids: current.content_ids.filter((itemId) => itemId !== id),
    }));
  }

  async function handleCreateEquipment(equipment: EquipmentDraft) {
    const ok = await onCreateEquipment(equipment, bind);
    if (ok) closeWizard();
  }

  async function handleCreateObject(object: ObjectDraft) {
    const ok = await onCreateObject(object, bind);
    if (ok) closeWizard();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      ...draft,
      name: draft.name.trim() || "Caja misteriosa",
    });
  }

  function handleBoxClose() {
    if (wizardOpen) {
      closeWizard();
      return;
    }
    if (!busy && !uploading) onClose();
  }

  return (
    <>
      <Modal
        open={open}
        size="xl"
        eyebrow={`${BRAND} — CAJA DE LOOT`}
        title={resource ? `Editar ${resource.name}` : "Nueva caja de loot"}
        subtitle="Elige tipo y piso. El + abre un flujo por pasos para meter o crear objetos."
        onClose={handleBoxClose}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Nombre"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Caja misteriosa"
            />
            <Select
              label="Tipo"
              value={draft.loot_rarity}
              onChange={(e) => setDraft({ ...draft, loot_rarity: e.target.value as LootBoxRarity })}
              options={lootBoxRarityOptions()}
            />
            <Select
              label="Piso"
              value={String(draft.loot_floor)}
              onChange={(e) => setDraft({ ...draft, loot_floor: Number(e.target.value) })}
              options={lootFloorOptions()}
            />
          </div>

          <div className="space-y-2">
            <p className="text-label">Contenido</p>
            <p className="text-xs text-[var(--text-3)]">
              Los objetos de esta caja heredan su rareza y el piso. No tienen rareza propia.
            </p>
            <div className="flex flex-wrap gap-2">
              {selected.map((item) => (
                <div key={item.id} className="relative w-16">
                  <InventorySlot
                    name={item.name}
                    rarity={item.rarity}
                    unique={itemIsUnique(item)}
                    iconUrl={resourceThumbUrl(item)}
                    hideRarity
                    showTooltip
                  />
                  <button
                    type="button"
                    aria-label={`Quitar ${item.name}`}
                    onClick={() => removeItem(item.id)}
                    className="absolute -right-1 -top-1 z-[1] flex h-5 w-5 items-center justify-center rounded-full border border-[var(--stroke-danger)] bg-[rgba(5,6,13,0.92)] text-[var(--danger)]"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                aria-label="Añadir objeto a la caja"
                onClick={() => setStep("source")}
                className="flex aspect-square w-16 flex-col items-center justify-center rounded-xl border border-dashed border-[rgba(255,255,255,0.16)] text-[var(--cyan-400)] hover:border-[var(--stroke-cyan)] hover:bg-[rgba(0,212,255,0.06)]"
              >
                <Plus size={18} strokeWidth={1.75} />
                <span className="mt-0.5 text-[8px] uppercase tracking-[0.14em]">Añadir</span>
              </button>
            </div>
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

          {(localError || error) && <p className="text-sm text-[var(--danger)]">{localError || error}</p>}
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
              {resource ? "Guardar" : "Crear caja"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={open && wizardOpen}
        stacked
        size={formStep ? "xl" : "md"}
        eyebrow={`${BRAND} — AÑADIR / ${
          step === "created"
            ? "CATÁLOGO"
            : step === "kind"
              ? "CREAR"
              : step === "equipment"
                ? "EQUIPO"
                : step === "consumable"
                  ? "CONSUMIBLE"
                  : step === "misc"
                    ? "MISCELÁNEO"
                    : "ORIGEN"
        }`}
        title={step === "closed" ? "" : wizardCopy[step].title}
        subtitle={step === "closed" ? undefined : wizardCopy[step].subtitle}
        onClose={closeWizard}
      >
        {step === "source" ? (
          <div className="space-y-3">
            <ChoiceCard
              icon={<Library size={18} strokeWidth={1.75} />}
              label="Objeto creado"
              hint="Elegir uno que ya está en el catálogo."
              onClick={() => setStep("created")}
            />
            <ChoiceCard
              icon={<Sparkles size={18} strokeWidth={1.75} />}
              label="Crear"
              hint="Abrir el editor y meterlo en esta caja."
              onClick={() => setStep("kind")}
            />
          </div>
        ) : null}

        {step === "created" ? (
          <div className="space-y-3">
            <Input
              label="Buscar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o tipo"
            />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {available.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addItem(item.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[rgba(0,212,255,0.06)]"
                >
                  <ResourceKindMark resource={item} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-1)]">{item.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                    {objectTypeLabel(item)}
                  </span>
                  {itemIsUnique(item) ? <Star size={11} className="text-[var(--gold-400)]" fill="currentColor" /> : null}
                </button>
              ))}
              {available.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[var(--text-4)]">
                  {catalogItems.length === 0 ? "No hay objetos en el catálogo." : "Nada coincide."}
                </p>
              ) : null}
            </div>
            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
              <ChevronLeft size={14} />
              Atrás
            </Button>
          </div>
        ) : null}

        {step === "kind" ? (
          <div className="space-y-3">
            <ChoiceCard
              icon={<Shield size={18} strokeWidth={1.75} />}
              label={ITEM_CATEGORY_LABEL.equipment}
              hint="Slot, unicidad y bonificadores. Igual que Nuevo equipo."
              onClick={() => setStep("equipment")}
            />
            <ChoiceCard
              icon={<Package size={18} strokeWidth={1.75} />}
              label={ITEM_CATEGORY_LABEL.consumable}
              hint="Se usa y se gasta. Igual que Nuevo consumible."
              onClick={() => setStep("consumable")}
            />
            <ChoiceCard
              icon={<Hexagon size={18} strokeWidth={1.75} />}
              label={ITEM_CATEGORY_LABEL.misc}
              hint="No se equipa. Igual que Nuevo misceláneo."
              onClick={() => setStep("misc")}
            />
            <Button type="button" variant="ghost" onClick={() => setStep("source")}>
              <ChevronLeft size={14} />
              Atrás
            </Button>
          </div>
        ) : null}

        {step === "equipment" ? (
          <EquipmentEditorForm
            key="loot-equipment"
            resource={null}
            sessionId={sessionId}
            busy={itemBusy}
            error={itemError}
            cancelLabel="Atrás"
            onCancel={() => setStep("kind")}
            onSave={(equipment) => void handleCreateEquipment(equipment)}
          />
        ) : null}

        {step === "consumable" || step === "misc" ? (
          <ObjectEditorForm
            key={`loot-${step}`}
            resource={null}
            category={step}
            sessionId={sessionId}
            busy={itemBusy}
            error={itemError}
            lockCategory
            cancelLabel="Atrás"
            onCancel={() => setStep("kind")}
            onSave={(object) => void handleCreateObject(object)}
          />
        ) : null}
      </Modal>
    </>
  );
}
