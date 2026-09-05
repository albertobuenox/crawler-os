import type { SupabaseClient } from "@supabase/supabase-js";
import type { Resource, ResourceKind } from "./types";

export type GrantDelivery = "reward" | "penalty" | "silent";

export const GRANTABLE_KINDS: ResourceKind[] = ["item", "box", "achievement"];

export const GRANT_DELIVERY_OPTIONS: { value: GrantDelivery; label: string }[] = [
  { value: "reward", label: "Cinemática de recompensa" },
  { value: "penalty", label: "Cinemática de penalización" },
  { value: "silent", label: "Silencioso (solo registro)" },
];

export function isGrantableResource(resource: Pick<Resource, "kind"> | null | undefined) {
  return Boolean(resource && GRANTABLE_KINDS.includes(resource.kind));
}

export function grantableResources(resources: Resource[]) {
  return resources.filter(isGrantableResource);
}

export async function grantResourceToCrawlers(
  supabase: SupabaseClient,
  input: {
    resourceId: string;
    crawlerIds: string[];
    mode: GrantDelivery;
    message?: string | null;
  },
) {
  return supabase.rpc("grant_resource", {
    p_resource_id: input.resourceId,
    p_crawler_ids: input.crawlerIds,
    p_mode: input.mode,
    p_system_message: input.message || null,
  });
}

export function grantCinematicPayload(mode: GrantDelivery, resource: Resource, message?: string) {
  const isBox = resource.kind === "box";
  return {
    type: mode === "penalty" ? "penalty" : isBox ? "loot_box" : "reward",
    title: mode === "penalty" ? "PENALTY" : isBox ? "LOOT BOX" : "REWARD",
    itemName: resource.name,
    rarity: resource.rarity,
    lootRarity: resource.loot_rarity ?? null,
    body: message || undefined,
  };
}
