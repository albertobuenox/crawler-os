"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { useSkillTimer } from "@/hooks/useSkillTimer";
import { formatSkillTimer } from "@/lib/skill-timer";
import { cn } from "@/lib/utils";

export function SkillTimerPanel({ sessionId }: { sessionId: string }) {
  const { elapsedSeconds, due, open, running, busy, error, setRunning, setOpen } = useSkillTimer(sessionId);
  const marked = useMarkedSkills(sessionId);

  return (
    <GlassPanel
      title="Temporizador de skills"
      subtitle={open ? "Ventana de subida abierta" : due ? "Han pasado 2 horas" : "Play / pause de la sesión"}
      className={cn(open && "border-[var(--stroke-cyan)]", !open && due && "border-[var(--stroke-reward)]")}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            className={cn(
              "font-stat text-4xl tracking-wide",
              open ? "text-[var(--cyan-400)]" : due ? "text-[var(--gold-400)]" : "text-[var(--text-1)]"
            )}
          >
            {formatSkillTimer(elapsedSeconds)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-3)]">
            {open
              ? "Los jugadores pueden subir o bajar las skills que hayan marcado."
              : due
                ? "Recordatorio: sube las skills que los jugadores han activado."
                : running
                  ? "Contando tiempo de partida."
                  : "En pausa."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={running ? "ghost" : "session"}
            size="sm"
            disabled={busy || open}
            onClick={() => void setRunning(!running)}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Pausa" : "Play"}
          </Button>
          {open ? (
            <Button type="button" variant="danger" size="sm" disabled={busy} onClick={() => void setOpen(false)}>
              Cerrar subida
            </Button>
          ) : (
            <Button type="button" variant="energy" size="sm" disabled={busy} onClick={() => void setOpen(true)}>
              Subir habilidades
            </Button>
          )}
        </div>
      </div>
      {marked.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-[var(--text-2)]">
          {marked.map((row) => (
            <li key={row.skillId}>
              <span className="text-[var(--gold-400)]">{row.crawlerName}</span>
              {" · "}
              {row.skillName}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}
    </GlassPanel>
  );
}

function useMarkedSkills(sessionId: string) {
  const [rows, setRows] = useState<{ skillId: string; crawlerName: string; skillName: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data: crawlers } = await supabase.from("crawlers").select("id, name").eq("session_id", sessionId);
      const list = crawlers ?? [];
      if (list.length === 0) {
        if (!cancelled) setRows([]);
        return;
      }
      const { data: skills } = await supabase
        .from("skills")
        .select("id, name, crawler_id")
        .gt("check_marks", 0)
        .in(
          "crawler_id",
          list.map((c) => c.id)
        );
      if (cancelled) return;
      const byId = new Map(list.map((c) => [c.id, c.name]));
      setRows(
        ((skills as { id: string; name: string; crawler_id: string }[]) ?? []).map((s) => ({
          skillId: s.id,
          crawlerName: byId.get(s.crawler_id) ?? "Crawler",
          skillName: s.name,
        }))
      );
    }

    void load();
    const channel = supabase
      .channel(`marked-skills:${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => void load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return rows;
}

export function SkillTimerChip() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from("session_members")
        .select("session_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (member?.session_id) setSessionId(member.session_id);
    })();
  }, []);

  const { elapsedSeconds, due, open, running } = useSkillTimer(sessionId);
  if (!sessionId || (!due && !open)) return null;

  return (
    <Link
      href="/dm"
      className={cn(
        "rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider",
        open
          ? "border-[var(--stroke-cyan)] text-[var(--cyan-400)]"
          : "border-[var(--stroke-reward)] text-[var(--gold-400)] shadow-[var(--glow-gold)]"
      )}
    >
      {open ? "Subida abierta" : `2h · ${formatSkillTimer(elapsedSeconds)}`}
      {running && !open ? " · play" : ""}
    </Link>
  );
}
