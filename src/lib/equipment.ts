import { itemIsUnique } from "@/lib/loot";
import type { ItemInstance, Resource } from "@/lib/types";

export const EQUIP_SLOT_IDS = [
  "head",
  "cloak",
  "chest",
  "gloves",
  "boots",
  "hand_right",
  "hand_left",
  "accessory",
] as const;

export type EquipSlotId = (typeof EQUIP_SLOT_IDS)[number];

export const BODY_SLOTS = [
  { id: "head", label: "Cabeza" },
  { id: "cloak", label: "Capa" },
  { id: "chest", label: "Torso" },
  { id: "gloves", label: "Guantes" },
  { id: "boots", label: "Botas" },
] as const;

export const HAND_SLOTS = [
  { id: "hand_right", label: "Mano derecha" },
  { id: "hand_left", label: "Mano izquierda" },
] as const;

export const ACCESSORY_SLOTS = [
  { id: "accessory_1", label: "Accesorio 1" },
  { id: "accessory_2", label: "Accesorio 2" },
  { id: "accessory_3", label: "Accesorio 3" },
] as const;

export const EQUIP_SLOT_OPTIONS: { value: EquipSlotId; label: string }[] = [
  { value: "head", label: "Cabeza" },
  { value: "cloak", label: "Capa" },
  { value: "chest", label: "Torso" },
  { value: "gloves", label: "Guantes" },
  { value: "boots", label: "Botas" },
  { value: "hand_right", label: "Mano derecha" },
  { value: "hand_left", label: "Mano izquierda" },
  { value: "accessory", label: "Accesorio" },
];

export const EQUIP_SLOT_LABEL: Record<string, string> = {
  head: "Cabeza",
  cloak: "Capa",
  chest: "Torso",
  gloves: "Guantes",
  boots: "Botas",
  hand_right: "Mano derecha",
  hand_left: "Mano izquierda",
  accessory: "Accesorio",
  accessory_1: "Accesorio 1",
  accessory_2: "Accesorio 2",
  accessory_3: "Accesorio 3",
};

export type EquipmentBonus = {
  id: string;
  text: string;
};

export function isEquipSlotId(value: unknown): value is EquipSlotId {
  return typeof value === "string" && (EQUIP_SLOT_IDS as readonly string[]).includes(value);
}

export function newBonusId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `bonus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyBonus(): EquipmentBonus {
  return { id: newBonusId(), text: "" };
}

export function parseEquipmentBonuses(payload: Record<string, unknown> | null | undefined): EquipmentBonus[] {
  const raw = payload?.bonuses;
  if (!Array.isArray(raw)) return [];
  const out: EquipmentBonus[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (!text) continue;
    out.push({
      id: typeof rec.id === "string" && rec.id ? rec.id : newBonusId(),
      text,
    });
  }
  return out;
}

export function buildEquipmentPayload(
  existing: Record<string, unknown> | null | undefined,
  bonuses: EquipmentBonus[],
  slot?: EquipSlotId,
) {
  const next = { ...(existing ?? {}) };
  const cleaned = bonuses
    .map((bonus) => ({
      id: bonus.id || newBonusId(),
      text: bonus.text.trim(),
    }))
    .filter((bonus) => bonus.text);
  next.bonuses = cleaned;
  if (slot) next.equip_slot = slot;
  return next;
}

export function resourceEquipSlot(resource: Pick<Resource, "equip_slot" | "payload"> | null | undefined): EquipSlotId | null {
  if (isEquipSlotId(resource?.equip_slot)) return resource.equip_slot;
  const fromPayload = resource?.payload?.equip_slot;
  return isEquipSlotId(fromPayload) ? fromPayload : null;
}

export function isEquippable(resource: Pick<Resource, "kind" | "equip_slot" | "payload"> | null | undefined) {
  return resource?.kind === "item" && Boolean(resourceEquipSlot(resource));
}

export function matchingBodySlots(itemSlot: EquipSlotId | null | undefined): string[] {
  if (!itemSlot) return [];
  if (itemSlot === "accessory") return ACCESSORY_SLOTS.map((slot) => slot.id);
  return [itemSlot];
}

export function slotAccepts(bodySlot: string, itemSlot: EquipSlotId | null | undefined) {
  return matchingBodySlots(itemSlot).includes(bodySlot);
}

export function firstOpenSlot(
  itemSlot: EquipSlotId,
  items: Array<Pick<ItemInstance, "id" | "equipped_slot">>,
  ignoreId?: string,
) {
  const taken = new Set(
    items
      .filter((item) => item.equipped_slot && item.id !== ignoreId)
      .map((item) => item.equipped_slot as string),
  );
  const candidates = matchingBodySlots(itemSlot);
  return candidates.find((slot) => !taken.has(slot)) ?? candidates[0] ?? null;
}

export function occupantInSlot(
  items: Array<ItemInstance & { resource: Resource }>,
  slot: string,
) {
  return items.find((item) => item.equipped_slot === slot) ?? null;
}

export function uniqueUnequipCopy(name: string) {
  return {
    title: `¿Desequipar ${name}?`,
    body: "Los objetos únicos no vuelven a la mochila. Si lo sueltas, el Sistema lo recicla. Para siempre.",
    confirmLabel: "Desequipar y perderlo",
  };
}

export function uniqueSwapCopy(name: string) {
  return {
    title: `¿Sustituir ${name}?`,
    body: `${name} es único. Al quitarlo del slot, el Sistema lo borra. No hay segunda oportunidad.`,
    confirmLabel: "Sustituir y destruirlo",
  };
}

export function equipmentNeedsUniqueConfirm(
  occupant: { resource: Pick<Resource, "is_unique"> } | null | undefined,
) {
  return Boolean(occupant && itemIsUnique(occupant.resource));
}

export function bonusLines(resource: Pick<Resource, "payload"> | null | undefined) {
  return parseEquipmentBonuses(resource?.payload).map((bonus) => bonus.text);
}

export const ITEM_DRAG_TYPE = "application/x-crawler-item";

export function writeItemDrag(event: { dataTransfer: DataTransfer | null }, itemId: string) {
  event.dataTransfer?.setData(ITEM_DRAG_TYPE, itemId);
  event.dataTransfer?.setData("text/plain", itemId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
}

export function readItemDrag(event: { dataTransfer: DataTransfer | null }) {
  return event.dataTransfer?.getData(ITEM_DRAG_TYPE) || event.dataTransfer?.getData("text/plain") || "";
}
