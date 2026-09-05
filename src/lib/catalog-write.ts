import type { SupabaseClient } from "@supabase/supabase-js";
import { buildLootContents } from "./loot";
import type { LootBoxRarity, Resource } from "./types";

const STRIP_KEYS = [
  "item_category",
  "equip_slot",
  "source_loot_rarity",
  "source_loot_floor",
  "loot_rarity",
  "loot_floor",
  "is_unique",
];

export async function upsertResource(
  supabase: SupabaseClient,
  sessionId: string,
  editingId: string | null,
  row: Record<string, unknown>,
) {
  let body: Record<string, unknown> = { ...row };
  for (let attempt = 0; attempt < STRIP_KEYS.length + 1; attempt += 1) {
    const result = editingId
      ? await supabase.from("resources").update(body).eq("id", editingId).select("*").single()
      : await supabase.from("resources").insert({ session_id: sessionId, ...body }).select("*").single();
    if (!result.error) return { data: result.data as Resource, error: null };
    const key = STRIP_KEYS.find((name) => name in body && new RegExp(name, "i").test(result.error.message));
    if (!key) return { data: null, error: result.error };
    const { [key]: _drop, ...rest } = body;
    body = rest;
  }
  return { data: null, error: { message: "No se pudo guardar el recurso." } };
}

export async function stampLootOrigin(
  supabase: SupabaseClient,
  ids: string[],
  lootRarity: LootBoxRarity,
  lootFloor: number,
) {
  if (ids.length === 0) return { error: null };
  const result = await supabase
    .from("resources")
    .update({
      source_loot_rarity: lootRarity,
      source_loot_floor: lootFloor,
    })
    .in("id", ids)
    .select("id");
  return { error: result.error };
}

export async function syncLootBoxRow(
  supabase: SupabaseClient,
  sessionId: string,
  resource: Resource,
  contentItems: Array<Pick<Resource, "id" | "name">>,
  lootRarity: LootBoxRarity,
  lootFloor: number,
) {
  const contents = buildLootContents(contentItems);
  const boxRow = {
    session_id: sessionId,
    resource_id: resource.id,
    contents,
    loot_rarity: lootRarity,
    loot_floor: lootFloor,
  };
  const { data: existing, error: lookupError } = await supabase
    .from("loot_boxes")
    .select("id")
    .eq("resource_id", resource.id)
    .eq("status", "sealed")
    .limit(1);
  if (lookupError) return { error: lookupError };
  if (existing && existing.length > 0) {
    return supabase
      .from("loot_boxes")
      .update({
        contents: boxRow.contents,
        loot_rarity: boxRow.loot_rarity,
        loot_floor: boxRow.loot_floor,
      })
      .eq("resource_id", resource.id)
      .eq("status", "sealed");
  }
  return supabase.from("loot_boxes").insert(boxRow);
}

export async function refreshSessionResources(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return { data: (data as Resource[]) ?? [], error };
}
