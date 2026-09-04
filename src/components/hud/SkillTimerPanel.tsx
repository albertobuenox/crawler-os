"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Pause, Pencil, Play, RotateCcw, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useSkillTimer } from "@/hooks/useSkillTimer";
import { composeSkillTimer, formatSkillTimer, splitSkillTimer } from "@/lib/skill-timer";
import { cn } from "@/lib/utils";

export function SkillTimerPanel({ sessionId }: { sessionId: string }) {
  const { elapsedSeconds, due, open, running, busy, error, setRunning, setElapsed, reset, setOpen } =
    useSkillTimer(sessionId);
  const marked = useMarkedSkills(sessionId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ hours: "00", minutes: "00", seconds: "00" });

  function startEdit() {
    const parts = splitSkillTimer(elapsedSeconds);
    setDraft({
      hours: String(parts.hours).padStart(2, "0"),
      minutes: String(parts.minutes).padStart(2, "0"),
      seconds: String(parts.seconds).padStart(2, "0"),
    });
    setEditing(true);
  }

  async function applyEdit() {
    const next = composeSkillTimer(Number(draft.hours), Number(draft.minutes), Number(draft.seconds));
    await setElapsed(next);
    setEditing(false);
  }

  return (
    <GlassPanel
      title="Temporizador de skills"
      subtitle={open ? "Ventana de subida abierta" : due ? "Han pasado 2 horas" : "Reproductor de la sesión"}
      className={cn(open && "border-[var(--stroke-cyan)]", !open && due && "border-[var(--stroke-reward)]")}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {editing ? (
            <form
              className="flex items-center gap-1 font-stat text-4xl tracking-wide text-[var(--text-1)]"
              onSubmit={(e) => {
                e.preventDefault();
                void applyEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditing(false);
              }}
            >
              <TimeField
                aria-label="Horas"
                value={draft.hours}
                max={99}
                onChange={(value) => setDraft((d) => ({ ...d, hours: value }))}
                autoFocus
              />
              <span className="text-[var(--text-3)]">:</span>
              <TimeField
                aria-label="Minutos"
                value={draft.minutes}
                max={59}
                onChange={(value) => setDraft((d) => ({ ...d, minutes: value }))}
              />
              <span className="text-[var(--text-3)]">:</span>
              <TimeField
                aria-label="Segundos"
                value={draft.seconds}
                max={59}
                onChange={(value) => setDraft((d) => ({ ...d, seconds: value }))}
              />
            </form>
          ) : (
            <button
              type="button"
              disabled={busy || open}
              onClick={startEdit}
              title="Editar tiempo"
              className={cn(
                "font-stat text-4xl tracking-wide transition-colors",
                open ? "text-[var(--cyan-400)]" : due ? "text-[var(--gold-400)]" : "text-[var(--text-1)]",
                !open && "hover:text-[var(--cyan-400)]"
              )}
            >
              {formatSkillTimer(elapsedSeconds)}
            </button>
          )}
          <p className="mt-1 text-xs text-[var(--text-3)]">
            {open
              ? "Los jugadores pueden subir o bajar las skills que hayan marcado."
              : due
                ? "Recordatorio: sube las skills que los jugadores han activado."
                : running
                  ? "Contando tiempo de partida."
                  : editing
                    ? "Escribe HH:MM:SS y confirma."
                    : "En pausa."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={open}
          aria-label={open ? "Subida de habilidades permitida" : "Subida de habilidades restringida"}
          disabled={busy}
          onClick={() => void setOpen(!open)}
          className={cn(
            "flex max-w-xs items-center gap-3 rounded-[var(--r-pill)] border px-3 py-2 text-left transition-all duration-[var(--t-ui)] disabled:cursor-not-allowed disabled:opacity-45",
            open
              ? "border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] shadow-[var(--glow-cyan)]"
              : "border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.55)]"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-[var(--t-ui)]",
              open
                ? "border-[var(--stroke-cyan-hot)] bg-[var(--cyan-500)] shadow-[var(--glow-cyan)]"
                : "border-[var(--stroke-glass)] bg-[rgba(100,116,139,0.35)]"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-[var(--text-1)] shadow-sm transition-transform duration-[var(--t-ui)]",
                open && "translate-x-5"
              )}
            />
          </span>
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-wider",
              open ? "text-[var(--cyan-400)]" : "text-[var(--text-3)]"
            )}
          >
            {open ? "Subida de habilidades permitida" : "Subida de habilidades restringida"}
          </span>
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editing ? (
          <>
            <TransportButton
              label="Aplicar tiempo"
              disabled={busy || open}
              onClick={() => void applyEdit()}
              accent
            >
              <Check size={16} />
            </TransportButton>
            <TransportButton
              label="Cancelar edición"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              <X size={16} />
            </TransportButton>
          </>
        ) : (
          <>
            <TransportButton
              label={running ? "Pausa" : "Play"}
              disabled={busy || open}
              onClick={() => void setRunning(!running)}
              accent={!running}
            >
              {running ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
            </TransportButton>
            <TransportButton
              label="Reset"
              disabled={busy || open || elapsedSeconds === 0}
              onClick={() => void reset()}
            >
              <RotateCcw size={16} />
            </TransportButton>
            <TransportButton
              label="Editar tiempo"
              disabled={busy || open}
              onClick={startEdit}
            >
              <Pencil size={15} />
            </TransportButton>
          </>
        )}
        <span className="ml-1 text-[11px] uppercase tracking-wider text-[var(--text-4)]">
          {editing ? "Confirmar · Cancelar" : "Play / Pausa · Reset · Editar"}
        </span>
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

function TransportButton({
  label,
  disabled,
  onClick,
  accent,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center !rounded-full border transition-all duration-[var(--t-ui)] disabled:cursor-not-allowed disabled:opacity-45",
        accent
          ? "btn-session border-transparent text-[var(--text-1)]"
          : "border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.65)] text-[var(--text-2)] hover:border-[var(--stroke-cyan)] hover:text-[var(--cyan-400)]"
      )}
    >
      {children}
    </button>
  );
}

function TimeField({
  value,
  max,
  onChange,
  autoFocus,
  "aria-label": ariaLabel,
}: {
  value: string;
  max: number;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  "aria-label": string;
}) {
  return (
    <input
      aria-label={ariaLabel}
      inputMode="numeric"
      autoFocus={autoFocus}
      value={value}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
        if (digits === "") {
          onChange("");
          return;
        }
        const n = Math.min(max, Number(digits));
        onChange(String(n));
      }}
      onBlur={() => {
        const n = Math.min(max, Math.max(0, Number(value) || 0));
        onChange(String(n).padStart(2, "0"));
      }}
      className="well h-11 w-16 rounded-[var(--r-md)] px-1 text-center font-stat text-3xl text-[var(--text-1)] outline-none focus:border-[var(--stroke-cyan-hot)] focus:shadow-[var(--glow-cyan)]"
    />
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
