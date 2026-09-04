"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { EventLogList } from "@/components/hud/EventLog";
import { PartyComparePanel } from "@/components/hud/PartyComparePanel";
import type { Crawler, Effect, EventLogEntry, GameSession, Skill } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { PHASE_LABEL, BRAND } from "@/lib/copy";
import { useRealtimeTable } from "@/hooks/useSession";
import { SkillTimerPanel } from "@/components/hud/SkillTimerPanel";
import Link from "next/link";

export default function DMDashboardPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
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
      const nextCrawlers = (cr as Crawler[]) ?? [];
      setCrawlers(nextCrawlers);
      setEvents((ev as EventLogEntry[]) ?? []);

      if (nextCrawlers.length > 0) {
        const ids = nextCrawlers.map((crawler) => crawler.id);
        const [{ data: sk }, { data: ef }] = await Promise.all([
          supabase.from("skills").select("*, skill_catalog(*)").in("crawler_id", ids),
          supabase.from("effects").select("*").in("crawler_id", ids),
        ]);
        setSkills((sk as Skill[]) ?? []);
        setEffects((ef as Effect[]) ?? []);
      } else {
        setSkills([]);
        setEffects([]);
      }
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
  useRealtimeTable<EventLogEntry>(
    "event_log",
    session ? `session_id=eq.${session.id}` : "session_id=eq.none",
    () => load()
  );

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`dm-home-intel:${session.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "effects" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase, load]);

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
    return <div className="text-[var(--text-3)]">{BRAND} está cargando...</div>;
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
          <Button variant="ghost" size="sm" onClick={() => setPhase("paused")}>
            Pausa
          </Button>
          <Link href="/dm/crawlers">
            <Button variant="energy" size="sm">
              Gestionar crawlers
            </Button>
          </Link>
        </div>
      </div>

      <SkillTimerPanel sessionId={session.id} />

      <PartyComparePanel crawlers={crawlers} skills={skills} effects={effects} />

      <GlassPanel title="Registro" subtitle="Últimos 8 eventos">
        <EventLogList entries={events} compact />
        <Link href="/dm/log" className="mt-3 inline-block text-xs text-[var(--cyan-400)]">
          Ver registro completo →
        </Link>
      </GlassPanel>
    </div>
  );
}
