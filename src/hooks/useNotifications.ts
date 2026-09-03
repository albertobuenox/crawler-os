"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";

const INBOX_LIMIT = 20;

export function useNotifications(channelName = "notification-inbox") {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setNotifications([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(INBOX_LIMIT);
    setNotifications((data as Notification[]) ?? []);
    setLoaded(true);
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

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    [supabase]
  );

  return { notifications, loaded, markRead, reload: load };
}
