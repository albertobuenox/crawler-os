"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useUnreadNotifications(channelName = "unread-notifications") {
  const supabase = createClient();
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCount(0);
      return;
    }
    const { count: unread } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setCount(unread ?? 0);
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, load, supabase]);

  return count;
}
