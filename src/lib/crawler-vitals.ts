import { createClient } from "@/lib/supabase/client";
import type { AvatarEmotion } from "@/lib/crawler-art";
import { queueVitalsFromSnapshot } from "@/lib/scene-log";

export async function updateCrawlerVitals(
  crawlerId: string,
  patch: {
    hp_boxes_filled?: number;
    mana_current?: number;
    avatar_emotion?: AvatarEmotion | null;
  }
) {
  const supabase = createClient();
  const shouldLog = patch.hp_boxes_filled !== undefined || patch.mana_current !== undefined;
  const { data: snapshot } = shouldLog
    ? await supabase
        .from("crawlers")
        .select("session_id, hp_boxes_filled, mana_current")
        .eq("id", crawlerId)
        .maybeSingle()
    : { data: null };

  const result = await supabase.from("crawlers").update(patch).eq("id", crawlerId);
  if (!result.error) {
    if (snapshot) queueVitalsFromSnapshot(crawlerId, snapshot, patch);
    return result;
  }
  if (patch.avatar_emotion === undefined) return result;

  const { avatar_emotion: _emotion, ...rest } = patch;
  if (Object.keys(rest).length === 0) return result;
  const retry = await supabase.from("crawlers").update(rest).eq("id", crawlerId);
  if (!retry.error && snapshot) queueVitalsFromSnapshot(crawlerId, snapshot, rest);
  return retry;
}
