"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { StatKPI } from "@/components/hud/StatKPI";
import { EventLogList } from "@/components/hud/EventLog";
import type { Crawler, EventLogEntry, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { useRealtimeTable } from "@/hooks/useSession";
import Link from "next/link";

export default function IADashboardPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from("session_members")
      .select("session_id, sessions(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const sess = castSession(member?.sessions);
    setSession(sess ?? null);

    if (sess) {
      const [{ data: cr }, { data: ev }] = await Promise.all([
        supabase.from("crawlers").select("*").eq("session_id", sess.id),
        supabase
          .from("event_log")
          .select("*")
          .eq("session_id", sess.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      setCrawlers((cr as Crawler[]) ?? []);
      setEvents((ev as EventLogEntry[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeTable<Crawler>(
    "crawlers",
    session ? `session_id=eq.${session.id}` : "session_id=eq.none",
    () => load()
  );

  async function createSession() {
    setCreating(true);
    const { data, error } = await supabase.rpc("create_game_session", {
      p_name: "Floor Session",
    });
    if (!error && data) await load();
    setCreating(false);
  }

  async function setPhase(phase: string) {
    if (!session) return;
    await supabase.from("sessions").update({ phase }).eq("id", session.id);
    load();
  }

  if (loading) {
    return <div className="text-[var(--text-3)]">The System is buffering...</div>;
  }

  if (!session) {
    return (
      <GlassPanel title="SESSION CONTROL" subtitle="No active session">
        <p className="mb-4 text-sm text-[var(--text-2)]">
          No hay sesión activa. El dungeon está aburrido.
        </p>
        <Button variant="session" onClick={createSession} loading={creating}>
          Iniciar Piso
        </Button>
      </GlassPanel>
    );
  }

  const alive = crawlers.filter((c) => c.status !== "dead").length;
  const downed = crawlers.filter((c) => c.status === "downed").length;
  const avgLevel =
    crawlers.length > 0
      ? Math.round(crawlers.reduce((s, c) => s + c.level, 0) / crawlers.length)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-wide">SESSION CONTROL</h2>
          <p className="text-sm text-[var(--text-cyan)]">
            Floor {session.floor_number} · {session.phase}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="session" size="sm" onClick={() => setPhase("exploration")}>
            Explore
          </Button>
          <Button variant="neon" size="sm" onClick={() => setPhase("combat_1")}>
            Combat
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase("paused")}>
            Pause
          </Button>
          <Link href="/ia/crawlers">
            <Button variant="energy" size="sm">
              Manage Crawlers
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassPanel>
          <StatKPI label="Crawlers alive" value={alive} />
        </GlassPanel>
        <GlassPanel>
          <StatKPI label="Avg level" value={avgLevel} />
        </GlassPanel>
        <GlassPanel>
          <StatKPI label="Downed" value={downed} sublabel="needs healing" />
        </GlassPanel>
        <GlassPanel>
          <StatKPI label="Floor FN" value={session.floor_number} sublabel="DC modifier" />
        </GlassPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel className="lg:col-span-2" title="Event Log" subtitle="Last 8 events">
          <EventLogList entries={events} compact />
          <Link href="/ia/log" className="mt-3 inline-block text-xs text-[var(--cyan-400)]">
            View full log →
          </Link>
        </GlassPanel>
        <GlassPanel title="Party status">
          <ul className="space-y-2">
            {crawlers.map((c) => (
              <li key={c.id} className="well flex items-center justify-between px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span className="capitalize text-[var(--text-3)]">{c.status}</span>
              </li>
            ))}
            {crawlers.length === 0 && (
              <p className="text-sm text-[var(--text-3)]">No crawlers yet.</p>
            )}
          </ul>
        </GlassPanel>
      </div>
    </div>
  );
}
