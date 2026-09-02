"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { StatKPI } from "@/components/hud/StatKPI";
import { EventLogList } from "@/components/hud/EventLog";
import type { Crawler, EventLogEntry, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { PHASE_LABEL, STATUS_LABEL } from "@/lib/copy";
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
      p_name: "Sesión de piso",
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
    return <div className="text-[var(--text-3)]">The System está cargando...</div>;
  }

  if (!session) {
    return (
      <GlassPanel title="CONTROL DE SESIÓN" subtitle="Sin sesión activa">
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
          <h2 className="font-display text-2xl tracking-wide">CONTROL DE SESIÓN</h2>
          <p className="text-sm text-[var(--text-cyan)]">
            Piso {session.floor_number} · {PHASE_LABEL[session.phase] ?? session.phase}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="session" size="sm" onClick={() => setPhase("exploration")}>
            Explorar
          </Button>
          <Button variant="neon" size="sm" onClick={() => setPhase("combat_1")}>
            Combate
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase("paused")}>
            Pausa
          </Button>
          <Link href="/ia/crawlers">
            <Button variant="energy" size="sm">
              Gestionar crawlers
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassPanel>
          <StatKPI label="Crawlers vivos" value={alive} />
        </GlassPanel>
        <GlassPanel>
          <StatKPI label="Nivel medio" value={avgLevel} />
        </GlassPanel>
        <GlassPanel>
          <StatKPI label="Caídos" value={downed} sublabel="necesitan curación" />
        </GlassPanel>
        <GlassPanel>
          <StatKPI label="Piso FN" value={session.floor_number} sublabel="modificador de DC" />
        </GlassPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel className="lg:col-span-2" title="Registro" subtitle="Últimos 8 eventos">
          <EventLogList entries={events} compact />
          <Link href="/ia/log" className="mt-3 inline-block text-xs text-[var(--cyan-400)]">
            Ver registro completo →
          </Link>
        </GlassPanel>
        <GlassPanel title="Estado del grupo">
          <ul className="space-y-2">
            {crawlers.map((c) => (
              <li key={c.id} className="well flex items-center justify-between px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span className="text-[var(--text-3)]">{STATUS_LABEL[c.status]}</span>
              </li>
            ))}
            {crawlers.length === 0 && (
              <p className="text-sm text-[var(--text-3)]">Aún no hay crawlers.</p>
            )}
          </ul>
        </GlassPanel>
      </div>
    </div>
  );
}
