import { resourceEquipSlot, type EquipSlotId } from "@/lib/equipment";
import { itemCategory } from "@/lib/objects";
import { RESOURCE_TYPE_MARK_SRC } from "@/lib/resources";
import type { Resource } from "@/lib/types";

export type ItemArtPreset = {
  id: string;
  label: string;
  src: string;
};

type GearPreset = ItemArtPreset & { slots: EquipSlotId[] };
type ObjectPreset = ItemArtPreset & { categories: Array<"consumable" | "misc"> };

function publicArtUrl(folder: "gear" | "objects", file: string) {
  return `/${folder}/${encodeURIComponent(file)}`;
}

const GEAR_PRESETS: GearPreset[] = [
  { id: "head-casco", label: "Casco", src: publicArtUrl("gear", "HEAD SLOT - CASCO.webp"), slots: ["head"] },
  { id: "head-sombrero", label: "Sombrero", src: publicArtUrl("gear", "HEAD SLOT - SOMBRERO.webp"), slots: ["head"] },
  { id: "head-capucha", label: "Capucha", src: publicArtUrl("gear", "HEAD SLOT - CAPUCHA.webp"), slots: ["head"] },
  { id: "chest-armadura", label: "Armadura", src: publicArtUrl("gear", "TORSO SLOT - ARMADURA.webp"), slots: ["chest"] },
  { id: "chest-ligera", label: "Armadura ligera", src: publicArtUrl("gear", "TORSO SLOT - ARMADURA LIGERA.webp"), slots: ["chest"] },
  { id: "chest-tunica", label: "Túnica", src: publicArtUrl("gear", "TORSO SLOT - TUNICA.webp"), slots: ["chest"] },
  { id: "cloak-capa", label: "Capa", src: publicArtUrl("gear", "ACCESORIES SLOT - CAPA.webp"), slots: ["cloak"] },
  { id: "hands-ligeros", label: "Guantes ligeros", src: publicArtUrl("gear", "HANDS SLOT - GUANTES LIGEROS.webp"), slots: ["gloves"] },
  { id: "hands-placas", label: "Guantes de placas", src: publicArtUrl("gear", "HANDS SLOT - GUANTES DE PLACAS.webp"), slots: ["gloves"] },
  { id: "hands-mago", label: "Guantes de mago", src: publicArtUrl("gear", "HANDS SLOT - GUANTES DE MAGO.webp"), slots: ["gloves"] },
  { id: "feet-ligeras", label: "Botas ligeras", src: publicArtUrl("gear", "FEET SLOT - BOTAS LIGERAS.webp"), slots: ["boots"] },
  { id: "feet-placas", label: "Botas de placas", src: publicArtUrl("gear", "FEET SLOT - BOTAS PLACAS.webp"), slots: ["boots"] },
  { id: "feet-mago", label: "Botas de mago", src: publicArtUrl("gear", "FEET SLOT - BOTAS DE MAGO.webp"), slots: ["boots"] },
  { id: "legs-grebas", label: "Grebas", src: publicArtUrl("gear", "LEGS SLOT - GREBAS.webp"), slots: ["boots"] },
  { id: "legs-pantalones", label: "Pantalones ligeros", src: publicArtUrl("gear", "LEGS SLOT - PANTALONES LIGEROS.webp"), slots: ["boots"] },
  { id: "legs-mago", label: "Pantalones de mago", src: publicArtUrl("gear", "LEGS SLOT - MAGO.webp"), slots: ["boots"] },
  { id: "arms-espada", label: "Espada larga", src: publicArtUrl("gear", "ARMS SLOT - ESPADA LARGA.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-ropera", label: "Ropera", src: publicArtUrl("gear", "ARMS SLOT - ROPERA.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-dagas", label: "Dagas", src: publicArtUrl("gear", "ARMS SLOT - DAGAS.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-hachas", label: "Hachas", src: publicArtUrl("gear", "ARMS SLOT - HACHAS.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-maza", label: "Maza", src: publicArtUrl("gear", "ARMS SLOT - MAZA.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-martillo", label: "Martillo", src: publicArtUrl("gear", "ARMS SLOT - MARTILLO.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-baston", label: "Bastón", src: publicArtUrl("gear", "ARMS SLOT - BASTON.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-alabarda", label: "Alabarda", src: publicArtUrl("gear", "ARMS SLOT - ALABARDA.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-arco", label: "Arco largo", src: publicArtUrl("gear", "ARMS SLOT - ARCO LARGO.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-ballesta", label: "Ballesta", src: publicArtUrl("gear", "ARMS SLOT - BALLESTA.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-pistola", label: "Pistola", src: publicArtUrl("gear", "ARMS SLOT - PISTOLA.webp"), slots: ["hand_right", "hand_left"] },
  { id: "arms-nudillos", label: "Nudillos", src: publicArtUrl("gear", "ARMS SLOT - NUDILLOS.webp"), slots: ["hand_right", "hand_left"] },
  { id: "acc-anillo", label: "Anillo", src: publicArtUrl("gear", "ACCESORIES SLOT - ANILLO.webp"), slots: ["accessory"] },
  { id: "acc-colgante", label: "Colgante", src: publicArtUrl("gear", "ACCESORIES SLOT - COLGANTE.webp"), slots: ["accessory"] },
];

const OBJECT_PRESETS: ObjectPreset[] = [
  { id: "obj-vida", label: "Poción de vida", src: publicArtUrl("objects", "OJECTS SLOT - POCION DE VIDA.webp"), categories: ["consumable"] },
  { id: "obj-mana", label: "Poción de maná", src: publicArtUrl("objects", "OJECTS SLOT - POCION DE MANA.webp"), categories: ["consumable"] },
  { id: "obj-pocion", label: "Poción", src: publicArtUrl("objects", "OJECTS SLOT - POCION GENERICA.webp"), categories: ["consumable", "misc"] },
  { id: "obj-pergamino", label: "Pergamino", src: publicArtUrl("objects", "OJECTS SLOT -PERGAMINO.webp"), categories: ["misc", "consumable"] },
];

export function isLocalItemArt(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith("/gear/") || url.startsWith("/objects/");
}

export function gearPresetsForSlot(slot: EquipSlotId): ItemArtPreset[] {
  return GEAR_PRESETS.filter((preset) => preset.slots.includes(slot)).map(({ slots: _slots, ...preset }) => preset);
}

export function objectPresetsForCategory(category: "consumable" | "misc"): ItemArtPreset[] {
  return OBJECT_PRESETS.filter((preset) => preset.categories.includes(category)).map(
    ({ categories: _categories, ...preset }) => preset,
  );
}

export function defaultGearArt(slot: EquipSlotId | null | undefined) {
  if (!slot) return null;
  return gearPresetsForSlot(slot)[0]?.src ?? null;
}

export function defaultObjectArt(category: "consumable" | "misc") {
  return objectPresetsForCategory(category)[0]?.src ?? null;
}

export function retargetGearArt(url: string | null | undefined, slot: EquipSlotId) {
  if (!url || isLocalItemArt(url)) {
    const stillFits = gearPresetsForSlot(slot).some((preset) => preset.src === url);
    if (stillFits) return url ?? defaultGearArt(slot);
    return defaultGearArt(slot);
  }
  return url;
}

export function retargetObjectArt(url: string | null | undefined, category: "consumable" | "misc") {
  if (!url || isLocalItemArt(url)) {
    const stillFits = objectPresetsForCategory(category).some((preset) => preset.src === url);
    if (stillFits) return url ?? defaultObjectArt(category);
    return defaultObjectArt(category);
  }
  return url;
}

export function resourceThumbUrl(
  resource:
    | Pick<Resource, "icon_url" | "kind" | "item_category" | "equip_slot" | "payload">
    | null
    | undefined,
) {
  const custom = resource?.icon_url?.trim();
  if (custom) return custom;
  if (!resource) return null;
  if (resource.kind === "box") return RESOURCE_TYPE_MARK_SRC.box;
  if (resource.kind !== "item") return null;
  const category = itemCategory(resource);
  if (category === "equipment") {
    return defaultGearArt(resourceEquipSlot(resource)) ?? RESOURCE_TYPE_MARK_SRC.equipment;
  }
  if (category === "consumable") return defaultObjectArt("consumable") ?? RESOURCE_TYPE_MARK_SRC.consumable;
  return defaultObjectArt("misc") ?? RESOURCE_TYPE_MARK_SRC.item;
}
