"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { emptySceneCanvas, parseSceneCanvas, stampSceneCanvas } from "@/lib/scene-canvas";
import type { SceneCanvasDoc } from "@/lib/types";

type Role = "dm" | "crawler";

export function useSceneCanvas(
  sessionId: string | undefined,
  options?: { role?: Role; selfId?: string | null }
) {
  const supabase = createClient();
  const role = options?.role ?? "crawler";
  const selfId = options?.selfId ?? null;
  const [doc, setDoc] = useState<SceneCanvasDoc | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastWriteAt = useRef(0);
  const dragging = useRef(false);
  const persistTimer = useRef<number | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const docRef = useRef<SceneCanvasDoc | null>(null);
  docRef.current = doc;

  const applyRemote = useCallback((row: unknown) => {
    const next = parseSceneCanvas(row && typeof row === "object" && "canvas" in row ? (row as { canvas: unknown }).canvas : row);
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
        .from("table_state")
        .select("canvas")
        .eq("session_id", sid)
        .maybeSingle();
      if (cancelled) return;
      if (readError) {
        setError(readError.message);
        setDoc(emptySceneCanvas());
        setReady(true);
        return;
      }
      setError(null);
      setDoc(parseSceneCanvas(data?.canvas));
      setReady(true);
    }

    void boot();

    const channel = supabase
      .channel(`scene-canvas:${sid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_state", filter: `session_id=eq.${sid}` },
        (payload) => applyRemote(payload.new)
      )
      .on("broadcast", { event: "scene_canvas_update" }, ({ payload }) => {
        if (payload) applyRemote(payload);
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      supabase.removeChannel(channel);
    };
  }, [applyRemote, sessionId, supabase]);

  const persistDm = useCallback(
    async (next: SceneCanvasDoc, immediate = false) => {
      if (!sessionId || role !== "dm") return;
      const write = async () => {
        const stamped = stampSceneCanvas({ ...next, pan_x: next.pan_x, pan_y: next.pan_y, zoom: next.zoom });
        lastWriteAt.current = Date.parse(stamped.updated_at);
        const { error: writeError } = await supabase
          .from("table_state")
          .update({
            canvas: stamped,
            shown_type: stamped.maps.length || stamped.tokens.length ? "map" : "none",
            show_grid: false,
          })
          .eq("session_id", sessionId);
        if (writeError) setError(writeError.message);
        else setError(null);
        await channelRef.current?.send({ type: "broadcast", event: "scene_canvas_update", payload: stamped });
      };
      if (immediate) {
        if (persistTimer.current) window.clearTimeout(persistTimer.current);
        await write();
        return;
      }
      if (persistTimer.current) window.clearTimeout(persistTimer.current);
      persistTimer.current = window.setTimeout(() => {
        void write();
      }, 80);
    },
    [role, sessionId, supabase]
  );

  const persistOwnToken = useCallback(
    async (next: SceneCanvasDoc, tokenId: string, immediate = false) => {
      if (!sessionId || role !== "crawler" || !selfId) return;
      const token = next.tokens.find((t) => t.id === tokenId);
      if (!token || token.crawler_id !== selfId) return;
      const write = async () => {
        const stamped = stampSceneCanvas(next);
        lastWriteAt.current = Date.parse(stamped.updated_at);
        await channelRef.current?.send({ type: "broadcast", event: "scene_canvas_update", payload: stamped });
        const { data, error: rpcError } = await supabase.rpc("move_own_scene_token", {
          p_session_id: sessionId,
          p_token_id: tokenId,
          p_x: token.x,
          p_y: token.y,
        });
        if (rpcError) setError(rpcError.message);
        else {
          setError(null);
          if (data) {
            const parsed = parseSceneCanvas(data);
            lastWriteAt.current = Date.parse(parsed.updated_at) || lastWriteAt.current;
          }
        }
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
    [role, selfId, sessionId, supabase]
  );

  const commit = useCallback(
    (next: SceneCanvasDoc, immediate = false) => {
      setDoc(next);
      void persistDm(next, immediate);
    },
    [persistDm]
  );

  const moveOwnToken = useCallback(
    (next: SceneCanvasDoc, tokenId: string, immediate = false) => {
      setDoc(next);
      void persistOwnToken(next, tokenId, immediate);
    },
    [persistOwnToken]
  );

  const setBusy = useCallback((busy: boolean) => {
    dragging.current = busy;
  }, []);

  return { doc, ready, error, commit, moveOwnToken, setBusy, role, selfId };
}
