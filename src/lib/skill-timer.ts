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
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
