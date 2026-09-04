import { createClient } from "@/lib/supabase/client";

export async function updateCrawlerVitals(
  crawlerId: string,
  patch: { hp_boxes_filled?: number; mana_current?: number }
) {
  const supabase = createClient();
  return supabase.from("crawlers").update(patch).eq("id", crawlerId);
}
