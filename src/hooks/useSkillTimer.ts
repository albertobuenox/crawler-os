"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameSession } from "@/lib/types";
import { skillTimerDue, skillTimerElapsedSeconds } from "@/lib/skill-timer";
import { castSession } from "@/lib/utils";

function rpcErrorMessage(error: { message: string; code?: string }) {
  if (error.code === "PGRST202" || /schema cache|does not exist/i.test(error.message)) {
    return "Falta aplicar el SQL del temporizador en Supabase. En el SQL Editor pega el archivo supabase/migrations/20260904180000_skill_advancement.sql y pulsa Run.";
  }
  return error.message;
}

export function useSkillTimer(sessionId?: string | null) {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      return;
    }
    const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    setSession(castSession(data));
  }, [sessionId, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`skill-timer:${sessionId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        () => void load()
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, sessionId, supabase]);

  useEffect(() => {
    if (!session?.skill_timer_running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [session?.skill_timer_running]);

  const elapsedSeconds = skillTimerElapsedSeconds(session, now);
  const due = skillTimerDue(elapsedSeconds);
  const open = Boolean(session?.skill_advancement_open);
  const running = Boolean(session?.skill_timer_running);

  const setRunning = useCallback(
    async (next: boolean) => {
      if (!sessionId) return;
      setBusy(true);
      setError("");
      const { error: rpcError } = await supabase.rpc("set_skill_timer", {
        p_session_id: sessionId,
        p_running: next,
      });
      setBusy(false);
      if (rpcError) {
        setError(rpcErrorMessage(rpcError));
        return;
      }
      setNow(Date.now());
      await load();
    },
    [load, sessionId, supabase]
  );

  const setOpen = useCallback(
    async (next: boolean) => {
      if (!sessionId) return;
      setBusy(true);
      setError("");
      const { error: rpcError } = await supabase.rpc("set_skill_advancement", {
        p_session_id: sessionId,
        p_open: next,
      });
      setBusy(false);
      if (rpcError) {
        setError(rpcErrorMessage(rpcError));
        return;
      }
      setNow(Date.now());
      await load();
    },
    [load, sessionId, supabase]
  );

  return {
    session,
    elapsedSeconds,
    due,
    open,
    running,
    busy,
    error,
    setRunning,
    setOpen,
    reload: load,
  };
}
