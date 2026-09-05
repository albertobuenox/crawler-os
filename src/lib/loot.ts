import type { LootBoxRarity, Resource } from "@/lib/types";

export const LOOT_BOX_RARITIES: LootBoxRarity[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "legendary",
  "celestial",
];

export const LOOT_BOX_RARITY_LABEL: Record<LootBoxRarity, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
  platinum: "Platino",
  legendary: "Legendario",
  celestial: "Celestial",
};

export const LOOT_BOX_RARITY_COLORS: Record<LootBoxRarity, string> = {
  bronze: "var(--loot-bronze)",
  silver: "var(--loot-silver)",
  gold: "var(--loot-gold)",
  platinum: "var(--loot-platinum)",
  legendary: "var(--loot-legendary)",
  celestial: "var(--loot-celestial)",
};

const LOOT_TO_ITEM_RARITY = {
  bronze: "common",
  silver: "uncommon",
  gold: "rare",
  platinum: "epic",
  legendary: "legendary",
  celestial: "celestial",
} as const;

export const LOOT_FLOOR_MIN = 1;
export const LOOT_FLOOR_MAX = 18;

export function isLootBoxRarity(value: unknown): value is LootBoxRarity {
  return typeof value === "string" && LOOT_BOX_RARITIES.includes(value as LootBoxRarity);
}

export function lootBoxRarityOptions() {
  return LOOT_BOX_RARITIES.map((value) => ({
    value,
    label: LOOT_BOX_RARITY_LABEL[value],
  }));
}

export function lootFloorOptions() {
  return Array.from({ length: LOOT_FLOOR_MAX - LOOT_FLOOR_MIN + 1 }, (_, i) => {
    const floor = i + LOOT_FLOOR_MIN;
    return { value: String(floor), label: lootFloorLabel(floor) };
  });
}

export function lootFloorLabel(floor: number | null | undefined) {
  if (!floor || floor < 1) return "Sin piso";
  return `Piso ${floor}`;
}

export function boxLootRarity(resource: Pick<Resource, "kind" | "loot_rarity"> | null | undefined): LootBoxRarity | null {
  if (resource?.kind !== "box") return null;
  return resource.loot_rarity && isLootBoxRarity(resource.loot_rarity) ? resource.loot_rarity : "bronze";
}

export function boxLootFloor(resource: Pick<Resource, "kind" | "loot_floor"> | null | undefined) {
  if (resource?.kind !== "box") return null;
  return resource.loot_floor && resource.loot_floor >= 1 ? resource.loot_floor : 1;
}

export function itemIsUnique(resource: Pick<Resource, "is_unique"> | null | undefined) {
  return Boolean(resource?.is_unique);
}

export function itemLootSource(
  resource: Pick<Resource, "source_loot_rarity" | "source_loot_floor"> | null | undefined,
) {
  const rarity = resource?.source_loot_rarity;
  if (!isLootBoxRarity(rarity)) return null;
  return {
    rarity,
    floor: resource?.source_loot_floor && resource.source_loot_floor >= 1 ? resource.source_loot_floor : null,
  };
}

export function lootOriginLabel(
  resource: Pick<Resource, "source_loot_rarity" | "source_loot_floor"> | null | undefined,
) {
  const source = itemLootSource(resource);
  if (!source) return null;
  const rarity = `Caja de loot ${LOOT_BOX_RARITY_LABEL[source.rarity]}`;
  return source.floor ? `${rarity} · ${lootFloorLabel(source.floor)}` : rarity;
}

export function boxMetaLabel(resource: Pick<Resource, "kind" | "loot_rarity" | "loot_floor"> | null | undefined) {
  const rarity = boxLootRarity(resource);
  if (!rarity) return null;
  return `${LOOT_BOX_RARITY_LABEL[rarity]} · ${lootFloorLabel(boxLootFloor(resource))}`;
}

export function lootHalo(rarity: LootBoxRarity) {
  const color = LOOT_BOX_RARITY_COLORS[rarity];
  if (rarity === "celestial") {
    return `0 0 10px ${color}, 0 0 22px var(--orange-500), 0 0 36px ${color}`;
  }
  if (rarity === "legendary") {
    return `0 0 12px ${color}, 0 0 26px var(--gold-400)`;
  }
  return `0 0 12px ${color}, 0 0 22px ${color}`;
}

export function rarityForBoxCompat(lootRarity: LootBoxRarity) {
  return LOOT_TO_ITEM_RARITY[lootRarity];
}

export type LootBoxContent = {
  resource_id: string;
  name?: string;
};

export function parseLootContents(payload: Record<string, unknown> | null | undefined): string[] {
  const raw = payload?.contents;
  if (!Array.isArray(raw)) return [];
  const ids: string[] = [];
  for (const entry of raw) {
    if (typeof entry === "string" && entry) ids.push(entry);
    else if (entry && typeof entry === "object" && "resource_id" in entry) {
      const id = (entry as { resource_id?: unknown }).resource_id;
      if (typeof id === "string" && id) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

export function buildLootContents(items: Array<Pick<Resource, "id" | "name">>): LootBoxContent[] {
  return items.map((item) => ({ resource_id: item.id, name: item.name }));
}

export function slotFromResource(resource: Resource | null | undefined) {
  return {
    lootRarity: boxLootRarity(resource),
    unique: itemIsUnique(resource),
    sourceLabel: lootOriginLabel(resource),
    hideRarity: resource?.kind === "item",
  };
}
