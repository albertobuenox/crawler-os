import { KIND_LABEL } from "./copy";
import { itemCategory } from "./objects";
import type { ItemCategory, Resource, ResourceKind } from "./types";

export type ResourceTypeMark = "equipment" | "consumable" | "item" | "npc" | "box" | "monster";

export const RESOURCE_TYPE_MARK_SRC: Record<ResourceTypeMark, string> = {
  equipment: "/resources/equipment.svg",
  consumable: "/resources/consumable.svg",
  item: "/resources/item.svg",
  npc: "/resources/npc.svg",
  box: "/resources/box.svg",
  monster: "/resources/monster.svg",
};

export const RESOURCE_TYPE_MARK_LABEL: Record<ResourceTypeMark, string> = {
  equipment: "Equipo",
  consumable: "Consumible",
  item: "Misceláneo",
  npc: "PNJ",
  box: "Caja de loot",
  monster: "Mob",
};

export function resourceTypeMark(
  resource: Pick<Resource, "kind" | "item_category" | "equip_slot" | "payload"> | null | undefined,
): ResourceTypeMark | null {
  if (!resource) return null;
  if (resource.kind === "box") return "box";
  if (resource.kind === "npc") return "npc";
  if (resource.kind === "monster") return "monster";
  if (resource.kind === "item") {
    const category: ItemCategory | null = itemCategory(resource);
    if (category === "equipment") return "equipment";
    if (category === "consumable") return "consumable";
    return "item";
  }
  return null;
}

export function resourceKindLabel(
  resource: Pick<Resource, "kind" | "item_category" | "equip_slot" | "payload"> | null | undefined,
): string {
  const mark = resourceTypeMark(resource);
  if (mark) return RESOURCE_TYPE_MARK_LABEL[mark];
  return resource ? KIND_LABEL[resource.kind as ResourceKind] : "";
}

/** Lore / factual text. Always visible to the Master, even if empty. */
export function resourceDescriptionLabel(
  resource: { description?: string | null } | null | undefined,
  empty = "Sin descripción.",
): string {
  return resource?.description?.trim() || empty;
}

/** Player-facing blurb: description first, then System voice, then extras. */
export function resourceBlurb(
  resource: { description?: string | null; system_copy?: string | null } | null | undefined,
  extras: Array<string | null | undefined> = [],
  empty = "Sin descripción.",
): string {
  for (const part of [resource?.description, resource?.system_copy, ...extras]) {
    const text = part?.trim();
    if (text) return text;
  }
  return empty;
}
