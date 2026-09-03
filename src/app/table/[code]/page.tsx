"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TableCanvas } from "@/components/hud/TableCanvas";
import type { TableState, MapPin, Resource, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { useSessionBroadcast } from "@/hooks/useSession";

/** TV / tablet view — no nav, full screen mesa */
export default function TableTVPage() {
  const { code } = useParams<{ code: string }>();
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [resource, setResource] = useState<Resource | null>(null);

  const load = useCallback(async () => {
    const { data: sess } = await supabase.from("sessions").select("*").eq("code", code?.toUpperCase()).maybeSingle();
    if (!sess) return;
    setSession(castSession(sess));
    const [{ data: ts }, { data: p }] = await Promise.all([
      supabase.from("table_state").select("*").eq("session_id", sess.id).maybeSingle(),
      supabase.from("map_pins").select("*").eq("session_id", sess.id),
    ]);
    setTableState(ts as TableState);
    setPins((p as MapPin[]) ?? []);
    if (ts?.resource_id) {
      const { data: r } = await supabase.from("resources").select("*").eq("id", ts.resource_id).single();
      setResource(r as Resource);
    }
  }, [code, supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`tv:${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_state" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "map_pins" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, supabase, code]);

  useSessionBroadcast(session?.id, useCallback((event) => {
    if (event === "table_update" || event === "dice_anim" || event === "cinematic") load();
  }, [load]));

  return (
    <div className="canvas-bokeh flex min-h-screen flex-col bg-[var(--void-950)] p-4">
      <header className="mb-4 text-center">
        <p className="font-display text-xs tracking-[0.3em] text-[var(--cyan-400)]">CRAWLER OS — ESCENA</p>
        {session?.name && <p className="text-sm text-[var(--text-3)]">{session.name}</p>}
      </header>
      <TableCanvas tableState={tableState} resource={resource} pins={pins} className="min-h-[70vh] flex-1" />
    </div>
  );
}
