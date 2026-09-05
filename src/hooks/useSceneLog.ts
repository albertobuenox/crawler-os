"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  isSceneLogRelevant,
  sceneLogFromEvent,
  upsertSceneLogEntry,
  type SceneLogItem,
} from "@/lib/scene-log";
import type { EventLogEntry } from "@/lib/types";

const HISTORY_LIMIT = 250;

export function useSceneLog(sessionId: string | undefined, names?: Record<string, string>) {
  const supabase = createClient();
  const [entries, setEntries] = useState<EventLogEntry[]>([]);
  const [ready, setReady] = useState(false);

  const pushEntry = useCallback((incoming: EventLogEntry) => {
    if (!sessionId || incoming.session_id !== sessionId || !isSceneLogRelevant(incoming)) return;
    setEntries((prev) => upsertSceneLogEntry(prev, incoming));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function boot() {
      const { data } = await supabase
        .from("event_log")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

      if (cancelled) return;
      const rows = ((data as EventLogEntry[]) ?? [])
        .filter((row) => isSceneLogRelevant(row))
        .reverse();
      setEntries(rows);
      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (!sessionId) return;
    const live = supabase
      .channel(`scene-log:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_log",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          pushEntry(payload.new as EventLogEntry);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(live);
    };
  }, [pushEntry, sessionId, supabase]);

  const items = useMemo(
    () =>
      entries
        .map((row) => sceneLogFromEvent(row, names))
        .filter((item): item is SceneLogItem => !!item),
    [entries, names]
  );

  return { items, ready, count: items.length };
}
