import type { GameSession } from "./types";

export const SKILL_ADVANCEMENT_SECONDS = 2 * 60 * 60;

export type SkillTimerFields = Pick<
  GameSession,
  "skill_timer_running" | "skill_timer_elapsed_seconds" | "skill_timer_started_at" | "skill_advancement_open"
>;

export function skillTimerElapsedSeconds(session: Partial<SkillTimerFields> | null | undefined, now = Date.now()): number {
  if (!session) return 0;
  const base = session.skill_timer_elapsed_seconds ?? 0;
  if (!session.skill_timer_running || !session.skill_timer_started_at) return base;
  const started = new Date(session.skill_timer_started_at).getTime();
  if (Number.isNaN(started)) return base;
  return base + Math.max(0, Math.floor((now - started) / 1000));
}

export function skillTimerDue(elapsedSeconds: number): boolean {
  return elapsedSeconds >= SKILL_ADVANCEMENT_SECONDS;
}

export function formatSkillTimer(totalSeconds: number): string {
  const { hours, minutes, seconds } = splitSkillTimer(totalSeconds);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function splitSkillTimer(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const s = Math.max(0, Math.floor(totalSeconds));
  return {
    hours: Math.floor(s / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function composeSkillTimer(hours: number, minutes: number, seconds: number): number {
  const h = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  const m = Number.isFinite(minutes) ? Math.min(59, Math.max(0, Math.floor(minutes))) : 0;
  const sec = Number.isFinite(seconds) ? Math.min(59, Math.max(0, Math.floor(seconds))) : 0;
  return h * 3600 + m * 60 + sec;
}
