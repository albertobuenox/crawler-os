"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, PackageOpen, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CatalogTable } from "@/components/dm/CatalogTable";
import { GiveToCrawlerModal } from "@/components/dm/GiveToCrawlerModal";
import { EquipmentEditorModal, type EquipmentDraft } from "@/components/dm/EquipmentEditorModal";
import { ObjectEditorModal, type ObjectDraft } from "@/components/dm/ObjectEditorModal";
import { LootBoxEditorModal, type LootBoxDraft } from "@/components/dm/LootBoxEditorModal";
import { useCreateRequest } from "@/hooks/useDmDeepLink";
import { useDmCatalog } from "@/hooks/useDmCatalog";
import { refreshSessionResources, stampLootOrigin, syncLootBoxRow, upsertResource } from "@/lib/catalog-write";
import { buildEquipmentPayload, EQUIP_SLOT_LABEL, resourceEquipSlot } from "@/lib/equipment";
import { itemIsUnique, lootOriginLabel, boxMetaLabel, LOOT_BOX_RARITY_COLORS, boxLootRarity, rarityForBoxCompat } from "@/lib/loot";
import { itemCategory, ITEM_CATEGORY_LABEL, objectTypeLabel } from "@/lib/objects";
import { Star } from "lucide-react";
import type { ItemCategory, LootBoxRarity, Resource } from "@/lib/types";

type Filter = "all" | ItemCategory | "box";
type ObjectCreate = "equipment" | "consumable" | "misc" | "box" | null;

export default function DMObjectsPage() {
  const { supabase, session, resources, setResources, crawlers, error, setError } = useDmCatalog();
  const [filter, setFilter] = useState<Filter>("all");
  const [create, setCreate] = useState<ObjectCreate>(null);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Resource | null>(null);
  const [pendingBoxItemId, setPendingBoxItemId] = useState<string | null>(null);
  const [boxStillOpen, setBoxStillOpen] = useState(false);
  const [itemFormError, setItemFormError] = useState("");
  const [giving, setGiving] = useState<Resource | null>(null);

  const objects = useMemo(
    () => resources.filter((resource) => resource.kind === "item" || resource.kind === "box"),
    [resources],
  );
  const catalogItems = objects.filter((resource) => resource.kind === "item");

  const filtered = objects.filter((resource) => {
    if (filter === "all") return true;
    if (filter === "box") return resource.kind === "box";
    return resource.kind === "item" && itemCategory(resource) === filter;
  });

  const openEquipment = useCallback(() => {
    setEditing(null);
    setFormError("");
    setCreate("equipment");
  }, []);
  const openConsumable = useCallback(() => {
    setEditing(null);
    setFormError("");
    setCreate("consumable");
  }, []);
  const openMisc = useCallback(() => {
    setEditing(null);
    setFormError("");
    setCreate("misc");
  }, []);
  const openBox = useCallback(() => {
    setEditing(null);
    setFormError("");
    setCreate("box");
    setBoxStillOpen(true);
  }, []);

  const openEdit = useCallback((resource: Resource) => {
    setEditing(resource);
    setFormError("");
    if (resource.kind === "box") {
      setCreate("box");
      setBoxStillOpen(true);
      return;
    }
    const category = itemCategory(resource);
    setCreate(category === "equipment" ? "equipment" : category === "consumable" ? "consumable" : "misc");
  }, []);

  useCreateRequest("equipment", openEquipment, "equipment");
  useCreateRequest("consumable", openConsumable, "consumable");
  useCreateRequest("misc", openMisc, "misc");
  useCreateRequest("box", openBox, "box");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (!editId || objects.length === 0) return;
    const found = objects.find((item) => item.id === editId);
    if (found) openEdit(found);
    params.delete("edit");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [objects, openEdit]);

  async function refresh() {
    if (!session) return;
    const { data } = await refreshSessionResources(supabase, session.id);
    setResources(data);
  }

  async function saveEquipment(
    draft: EquipmentDraft,
    bind?: { rarity: LootBoxRarity; floor: number } | null,
  ) {
    if (!session) return false;
    const fromBox = Boolean(bind);
    if (fromBox) setItemFormError("");
    else setFormError("");
    setBusy(true);
    const payload = buildEquipmentPayload(fromBox ? {} : editing?.payload, draft.bonuses, draft.equip_slot);
    const result = await upsertResource(supabase, session.id, fromBox ? null : editing?.id ?? null, {
      name: draft.name,
      kind: "item",
      rarity: fromBox ? "common" : editing?.rarity ?? "common",
      description: draft.description || null,
      system_copy: draft.system_copy || null,
      icon_url: draft.icon_url,
      loot_rarity: null,
      loot_floor: null,
      is_unique: draft.is_unique,
      equip_slot: draft.equip_slot,
      item_category: "equipment",
      payload,
      ...(bind
        ? { source_loot_rarity: bind.rarity, source_loot_floor: bind.floor }
        : {}),
    });
    setBusy(false);
    if (result.error || !result.data) {
      const message = result.error?.message ?? "No se pudo guardar.";
      if (fromBox) setItemFormError(message);
      else setFormError(message);
      return false;
    }
    if (fromBox) {
      setPendingBoxItemId(result.data.id);
      await refresh();
      return true;
    }
    await refresh();
    setCreate(null);
    setEditing(null);
    return true;
  }

  async function saveObject(
    draft: ObjectDraft,
    bind?: { rarity: LootBoxRarity; floor: number } | null,
  ) {
    if (!session) return false;
    const fromBox = Boolean(bind);
    if (fromBox) setItemFormError("");
    else setFormError("");
    setBusy(true);
    const result = await upsertResource(supabase, session.id, fromBox ? null : editing?.id ?? null, {
      name: draft.name,
      kind: "item",
      rarity: fromBox ? "common" : editing?.rarity ?? "common",
      description: draft.description || null,
      system_copy: draft.system_copy || null,
      icon_url: draft.icon_url,
      loot_rarity: null,
      loot_floor: null,
      is_unique: false,
      equip_slot: null,
      item_category: draft.category,
      payload: fromBox ? {} : editing?.payload ?? {},
      ...(bind
        ? { source_loot_rarity: bind.rarity, source_loot_floor: bind.floor }
        : {}),
    });
    setBusy(false);
    if (result.error || !result.data) {
      const message = result.error?.message ?? "No se pudo guardar.";
      if (fromBox) setItemFormError(message);
      else setFormError(message);
      return false;
    }
    if (fromBox) {
      setPendingBoxItemId(result.data.id);
      await refresh();
      return true;
    }
    await refresh();
    setCreate(null);
    setEditing(null);
    return true;
  }

  async function saveBox(draft: LootBoxDraft) {
    if (!session) return;
    setFormError("");
    setBusy(true);
    const contentItems = catalogItems.filter((item) => draft.content_ids.includes(item.id));
    const result = await upsertResource(supabase, session.id, editing?.kind === "box" ? editing.id : null, {
      name: draft.name,
      kind: "box",
      rarity: rarityForBoxCompat(draft.loot_rarity),
      description: editing?.description ?? null,
      system_copy: editing?.system_copy ?? null,
      icon_url: draft.icon_url,
      loot_rarity: draft.loot_rarity,
      loot_floor: draft.loot_floor,
      is_unique: false,
      item_category: null,
      payload: { contents: contentItems.map((item) => ({ resource_id: item.id, name: item.name })) },
    });
    if (result.error || !result.data) {
      setBusy(false);
      setFormError(result.error?.message ?? "No se pudo guardar.");
      return;
    }
    if (draft.content_ids.length > 0) {
      const stamp = await stampLootOrigin(supabase, draft.content_ids, draft.loot_rarity, draft.loot_floor);
      if (stamp.error) {
        setBusy(false);
        setFormError(stamp.error.message);
        return;
      }
    }
    const sync = await syncLootBoxRow(supabase, session.id, result.data, contentItems, draft.loot_rarity, draft.loot_floor);
    if (sync.error) {
      setBusy(false);
      setFormError(sync.error.message);
      return;
    }
    setBusy(false);
    await refresh();
    setCreate(null);
    setEditing(null);
    setBoxStillOpen(false);
    setPendingBoxItemId(null);
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
    setCreate(null);
    setEditing(null);
    setBoxStillOpen(false);
  }

  const modalOpen = create !== null;
  const editingEquipment = editing?.kind === "item" && itemCategory(editing) === "equipment" ? editing : null;
  const editingObject = editing?.kind === "item" && itemCategory(editing) !== "equipment" ? editing : null;
  const editingBox = editing?.kind === "box" ? editing : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Objetos</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Equipo, consumibles, misceláneos y cajas de loot. El equipo no tiene rareza: tiene slot.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="neon" onClick={openEquipment}>
            <Shield size={16} strokeWidth={1.75} />
            Nuevo equipo
          </Button>
          <Button variant="neon" onClick={openConsumable}>
            <Package size={16} strokeWidth={1.75} />
            Nuevo consumible
          </Button>
          <Button variant="neon" onClick={openMisc}>
            Nuevo misceláneo
          </Button>
          <Button variant="energy" onClick={openBox}>
            <PackageOpen size={16} strokeWidth={1.75} />
            Nueva caja de loot
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {([
          ["all", "Todo"],
          ["equipment", ITEM_CATEGORY_LABEL.equipment],
          ["consumable", ITEM_CATEGORY_LABEL.consumable],
          ["misc", ITEM_CATEGORY_LABEL.misc],
          ["box", "Cajas de loot"],
        ] as const).map(([value, label]) => (
          <Button key={value} variant={filter === value ? "neon" : "ghost"} size="sm" onClick={() => setFilter(value)}>
            {label}
          </Button>
        ))}
      </div>

      <CatalogTable
        resources={filtered}
        empty="No hay objetos en este filtro."
        tipsDisabled={modalOpen || !!pendingDelete || !!giving}
        onEdit={openEdit}
        onDelete={setPendingDelete}
        onGrant={setGiving}
        columns={[
          { id: "description", label: "Descripción", cell: () => null },
          {
            id: "type",
            label: "Tipo",
            cell: (resource) => <span className="text-[var(--text-3)]">{objectTypeLabel(resource)}</span>,
          },
          {
            id: "slot",
            label: "Slot",
            cell: (resource) => {
              const slot = resourceEquipSlot(resource);
              return <span className="whitespace-nowrap text-[var(--text-3)]">{slot ? EQUIP_SLOT_LABEL[slot] : "—"}</span>;
            },
          },
          {
            id: "origin",
            label: "Origen",
            cell: (resource) => {
              if (resource.kind === "box") {
                const rarity = boxLootRarity(resource);
                return (
                  <span style={{ color: rarity ? LOOT_BOX_RARITY_COLORS[rarity] : undefined }}>
                    {boxMetaLabel(resource) ?? "Caja"}
                  </span>
                );
              }
              const origin = lootOriginLabel(resource);
              if (origin) return <span className="text-[var(--text-3)]">{origin}</span>;
              return (
                <span className="inline-flex items-center gap-1 text-[var(--text-4)]">
                  {itemIsUnique(resource) ? <Star size={12} className="text-[var(--gold-400)]" fill="currentColor" /> : null}
                  {itemIsUnique(resource) ? "Único" : "—"}
                </span>
              );
            },
          },
        ]}
      />

      <EquipmentEditorModal
        open={create === "equipment"}
        resource={editingEquipment}
        sessionId={session?.id ?? null}
        busy={busy}
        error={formError}
        onClose={() => {
          if (busy) return;
          setCreate(null);
          setEditing(null);
        }}
        onSave={(draft) => void saveEquipment(draft)}
        onDelete={editingEquipment ? () => setPendingDelete(editingEquipment) : undefined}
      />

      <ObjectEditorModal
        open={create === "consumable" || create === "misc"}
        resource={editingObject}
        category={create === "consumable" ? "consumable" : "misc"}
        sessionId={session?.id ?? null}
        busy={busy}
        error={formError}
        onClose={() => {
          if (busy) return;
          setCreate(null);
          setEditing(null);
        }}
        onSave={(draft) => void saveObject(draft)}
        onDelete={editingObject ? () => setPendingDelete(editingObject) : undefined}
      />

      <LootBoxEditorModal
        open={boxStillOpen}
        resource={editingBox}
        sessionId={session?.id ?? null}
        catalogItems={catalogItems.filter((item) => item.id !== editingBox?.id)}
        busy={busy}
        error={formError}
        itemBusy={busy}
        itemError={itemFormError}
        pendingContentId={pendingBoxItemId}
        onClose={() => {
          if (busy) return;
          setCreate(null);
          setEditing(null);
          setBoxStillOpen(false);
          setPendingBoxItemId(null);
          setItemFormError("");
        }}
        onSave={(draft) => void saveBox(draft)}
        onDelete={editingBox ? () => setPendingDelete(editingBox) : undefined}
        onCreateEquipment={(draft, bind) => saveEquipment(draft, bind)}
        onCreateObject={(draft, bind) => saveObject(draft, bind)}
      />

      <GiveToCrawlerModal
        open={!!giving}
        sessionId={session?.id ?? null}
        resource={giving}
        resources={objects}
        crawlers={crawlers}
        onClose={() => setGiving(null)}
      />

      <ConfirmModal
        open={!!pendingDelete}
        title={`¿Borrar ${pendingDelete?.name ?? "este objeto"}?`}
        body="También se quitará de inventarios y cajas que lo usen."
        loading={busy}
        onCancel={() => {
          if (!busy) setPendingDelete(null);
        }}
        onConfirm={() => void deleteResource()}
      />
    </div>
  );
}
