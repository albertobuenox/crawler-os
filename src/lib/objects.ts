import { KIND_LABEL } from "./copy";
import { isEquippable } from "./equipment";
import type { ItemCategory, Resource, ResourceKind } from "./types";

export const ITEM_CATEGORIES: ItemCategory[] = ["equipment", "consumable", "misc"];

export const ITEM_CATEGORY_LABEL: Record<ItemCategory, string> = {
  equipment: "Equipo",
  consumable: "Consumible",
  misc: "Misceláneo",
};

export const OBJECT_KINDS: ResourceKind[] = ["item", "box"];
export const NPC_KINDS: ResourceKind[] = ["npc"];
export const MOB_KINDS: ResourceKind[] = ["monster"];
export const leftoverResourceKinds: ResourceKind[] = [
  "achievement",
  "map",
  "buff",
  "debuff",
  "quest",
  "floor",
  "skill_template",
];

export function isItemCategory(value: unknown): value is ItemCategory {
  return typeof value === "string" && ITEM_CATEGORIES.includes(value as ItemCategory);
}

export function itemCategory(
  resource: Pick<Resource, "kind" | "item_category" | "equip_slot" | "payload"> | null | undefined,
): ItemCategory | null {
  if (!resource || resource.kind !== "item") return null;
  if (isItemCategory(resource.item_category)) return resource.item_category;
  return isEquippable(resource) ? "equipment" : "misc";
}

export function objectTypeLabel(
  resource: Pick<Resource, "kind" | "item_category" | "equip_slot" | "payload"> | null | undefined,
): string {
  if (!resource) return "";
  if (resource.kind === "box") return KIND_LABEL.box;
  if (resource.kind === "item") {
    const category = itemCategory(resource);
    return category ? ITEM_CATEGORY_LABEL[category] : KIND_LABEL.item;
  }
  return KIND_LABEL[resource.kind];
}

export function isObjectResource(resource: Pick<Resource, "kind"> | null | undefined) {
  return resource?.kind === "item" || resource?.kind === "box";
}

export function catalogHref(resource: Pick<Resource, "id" | "kind">) {
  if (resource.kind === "item" || resource.kind === "box") return `/dm/objects?edit=${resource.id}`;
  if (resource.kind === "npc") return `/dm/npcs?edit=${resource.id}`;
  if (resource.kind === "monster") return `/dm/mobs?edit=${resource.id}`;
  return `/dm/resources?edit=${resource.id}`;
}
