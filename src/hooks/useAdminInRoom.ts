"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchActiveMembership, useRealtimeTable, useSessionBroadcast } from "@/hooks/useSession";

function payloadActive(payload: unknown): boolean | null {
  if (!payload || typeof payload !== "object" || !("active" in payload)) return null;
  return Boolean((payload as { active: unknown }).active);
}

export function useAdminInRoom(sessionId: string | undefined) {
  const supabase = createClient();
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!sessionId) {
      setActive(false);
      setReady(false);
      return;
    }
    const { data } = await supabase
      .from("table_state")
      .select("admin_in_room")
      .eq("session_id", sessionId)
      .maybeSingle();
    setActive(Boolean((data as { admin_in_room?: boolean } | null)?.admin_in_room));
    setReady(true);
  }, [sessionId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable<{ admin_in_room?: boolean }>(
    "table_state",
    sessionId ? `session_id=eq.${sessionId}` : "session_id=eq.none",
    ({ new: row }) => {
      if (row && "admin_in_room" in row) setActive(Boolean(row.admin_in_room));
    }
  );

  const { broadcast } = useSessionBroadcast(
    sessionId,
    useCallback((event, payload) => {
      if (event !== "admin_in_room") return;
      const next = payloadActive(payload);
      if (next !== null) setActive(next);
    }, [])
  );

  const setAdminInRoom = useCallback(
    async (next: boolean) => {
      if (!sessionId || pending) return;
      const previous = active;
      setActive(next);
      setPending(true);
      try {
        const { error } = await supabase
          .from("table_state")
          .update({ admin_in_room: next })
          .eq("session_id", sessionId);
        if (error) {
          setActive(previous);
          return;
        }
        await broadcast("admin_in_room", { active: next });
      } catch {
        setActive(previous);
      } finally {
        setPending(false);
      }
    },
    [active, broadcast, pending, sessionId, supabase]
  );

  return { active, ready, pending, setAdminInRoom };
}

export function useCrawlerSessionId() {
  const supabase = createClient();
  const [sessionId, setSessionId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const member = await fetchActiveMembership(user.id);
      if (!cancelled) setSessionId(member?.session_id ?? undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return sessionId;
}
