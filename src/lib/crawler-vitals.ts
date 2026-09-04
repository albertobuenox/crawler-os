import { createClient } from "@/lib/supabase/client";
import type { AvatarEmotion } from "@/lib/crawler-art";

export async function updateCrawlerVitals(
  crawlerId: string,
  patch: {
    hp_boxes_filled?: number;
    mana_current?: number;
    avatar_emotion?: AvatarEmotion | null;
  }
) {
  const supabase = createClient();
  const result = await supabase.from("crawlers").update(patch).eq("id", crawlerId);
  if (!result.error || patch.avatar_emotion === undefined) return result;

  const { avatar_emotion: _emotion, ...rest } = patch;
  if (Object.keys(rest).length === 0) return result;
  return supabase.from("crawlers").update(rest).eq("id", crawlerId);
}
