"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { TableCanvas } from "@/components/hud/TableCanvas";
import type { TableState, MapPin, Resource } from "@/lib/types";
import { useSessionBroadcast } from "@/hooks/useSession";

export default function CrawlerTablePage() {
  const supabase = createClient();
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [resource, setResource] = useState<Resource | null>(null);
  const [sessionId, setSessionId] = useState<string>();

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from("session_members").select("session_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!member) return;
    setSessionId(member.session_id);
    const [{ data: ts }, { data: p }] = await Promise.all([
      supabase.from("table_state").select("*").eq("session_id", member.session_id).maybeSingle(),
      supabase.from("map_pins").select("*").eq("session_id", member.session_id),
    ]);
    setTableState(ts as TableState);
    setPins((p as MapPin[]) ?? []);
    if (ts?.resource_id) {
      const { data: r } = await supabase.from("resources").select("*").eq("id", ts.resource_id).single();
      setResource(r as Resource);
    }
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("crawler-table")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_state" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "map_pins" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, supabase]);

  useSessionBroadcast(sessionId, useCallback((event) => {
    if (event === "table_update") load();
  }, [load]));

  return (
    <main className="fixed inset-0 z-[var(--z-shell)] bg-[var(--void-950)] pb-[72px]">
      <div className="flex h-full flex-col p-2">
        <p className="mb-2 text-center font-display text-xs tracking-widest text-[var(--cyan-400)]">MESA</p>
        <TableCanvas tableState={tableState} resource={resource} pins={pins} className="min-h-0 flex-1" />
      </div>
    </main>
  );
}
