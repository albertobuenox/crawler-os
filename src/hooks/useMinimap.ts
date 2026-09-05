"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { emptyMinimapDoc, parseMinimapDoc } from "@/lib/minimap";
import type { MinimapDoc } from "@/lib/types";

export function useMinimap(sessionId: string | undefined, options?: { ensure?: boolean }) {
  const supabase = createClient();
  const [doc, setDoc] = useState<MinimapDoc | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lastWriteAt = useRef(0);
  const dragging = useRef(false);
  const persistTimer = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const ensure = options?.ensure ?? false;

  const applyRemote = useCallback((row: unknown, sid: string) => {
    const next = parseMinimapDoc(row, sid);
    const incoming = Date.parse(next.updated_at) || 0;
    if (incoming && incoming <= lastWriteAt.current) return;
    if (dragging.current) return;
    setDoc(next);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setDoc(null);
      setReady(false);
      return;
    }
    const sid = sessionId;
    let cancelled = false;

    async function boot() {
      setReady(false);
      const { data, error: readError } = await supabase
        .from("minimap_state")
        .select("*")
        .eq("session_id", sid)
        .maybeSingle();
      if (cancelled) return;
      if (readError) {
        setError(readError.message);
        setDoc(emptyMinimapDoc(sid));
        setReady(true);
        return;
      }
      if (!data && ensure) {
        const empty = emptyMinimapDoc(sid);
        const { data: created, error: writeError } = await supabase
          .from("minimap_state")
          .upsert({
            session_id: sid,
            tokens: empty.tokens,
            strokes: empty.strokes,
            fixtures: empty.fixtures,
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (cancelled) return;
        if (writeError) {
          setError(writeError.message);
          setDoc(empty);
        } else {
          setError(null);
          setDoc(parseMinimapDoc(created, sid));
        }
        setReady(true);
        return;
      }
      setError(null);
      setDoc(data ? parseMinimapDoc(data, sid) : emptyMinimapDoc(sid));
      setReady(true);
    }

    void boot();

    const channel = supabase
      .channel(`minimap:${sid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "minimap_state", filter: `session_id=eq.${sid}` },
        (payload) => applyRemote(payload.new, sid)
      )
      .on("broadcast", { event: "minimap_update" }, ({ payload }) => {
        if (payload && typeof payload === "object") applyRemote(payload, sid);
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      supabase.removeChannel(channel);
    };
  }, [applyRemote, ensure, sessionId, supabase]);

  const persist = useCallback(
    async (next: MinimapDoc, immediate = false) => {
      if (!sessionId) return;
      const write = async () => {
        setSaving(true);
        const stamped = { ...next, session_id: sessionId, updated_at: new Date().toISOString() };
        lastWriteAt.current = Date.parse(stamped.updated_at);
        const { error: writeError } = await supabase.from("minimap_state").upsert({
          session_id: sessionId,
          tokens: stamped.tokens,
          strokes: stamped.strokes,
          fixtures: stamped.fixtures,
          updated_at: stamped.updated_at,
        });
        if (writeError) setError(writeError.message);
        else setError(null);
        await channelRef.current?.send({ type: "broadcast", event: "minimap_update", payload: stamped });
        setSaving(false);
      };
      if (immediate) {
        if (persistTimer.current) window.clearTimeout(persistTimer.current);
        await write();
        return;
      }
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        void write();
      }, 90);
    },
    [sessionId, supabase]
  );

  const commit = useCallback(
    (next: MinimapDoc, immediate = false) => {
      setDoc(next);
      void persist(next, immediate);
    },
    [persist]
  );

  const setBusy = useCallback((busy: boolean) => {
    dragging.current = busy;
  }, []);

  return { doc, ready, error, saving, commit, setBusy };
}
