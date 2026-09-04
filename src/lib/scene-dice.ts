import { parseAvatarEmotion, type AvatarEmotion } from "@/lib/crawler-art";

export const SCENE_DICE_SIDES = [2, 4, 6, 8, 10, 20] as const;
export type SceneDieSides = (typeof SCENE_DICE_SIDES)[number];

export type SceneDicePhase = "choosing" | "idle" | "ready" | "result" | "close";

export type SceneDiceEvent = {
  v: 1;
  phase: SceneDicePhase;
  crawlerId: string;
  name: string;
  sides: SceneDieSides | null;
  value: number | null;
  emotion: AvatarEmotion | null;
  portraitUrl: string | null;
  ts: number;
};

export type SceneDiceState =
  | {
      mode: "choosing";
      crawlerId: string;
      name: string;
      emotion: AvatarEmotion | null;
      portraitUrl: string | null;
      ts: number;
    }
  | {
      mode: "ceremony";
      crawlerId: string;
      name: string;
      sides: SceneDieSides;
      value: number | null;
      emotion: AvatarEmotion | null;
      portraitUrl: string | null;
      ts: number;
    };

function isDieSides(value: unknown): value is SceneDieSides {
  return value === 2 || value === 4 || value === 6 || value === 8 || value === 10 || value === 20;
}

export function dieLabel(sides: SceneDieSides) {
  return `d${sides}`;
}

export function rollDie(sides: SceneDieSides) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % sides) + 1;
}

export function makeSceneDiceEvent(
  partial: Omit<SceneDiceEvent, "v" | "ts"> & { ts?: number }
): SceneDiceEvent {
  return {
    v: 1,
    ts: partial.ts ?? Date.now(),
    phase: partial.phase,
    crawlerId: partial.crawlerId,
    name: partial.name,
    sides: partial.sides,
    value: partial.value,
    emotion: partial.emotion,
    portraitUrl: partial.portraitUrl,
  };
}

export function parseSceneDiceEvent(payload: unknown): SceneDiceEvent | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  if (raw.v !== 1) return null;
  const phase = raw.phase;
  if (
    phase !== "choosing" &&
    phase !== "idle" &&
    phase !== "ready" &&
    phase !== "result" &&
    phase !== "close"
  ) {
    return null;
  }
  if (typeof raw.crawlerId !== "string" || !raw.crawlerId) return null;
  if (typeof raw.ts !== "number" || !Number.isFinite(raw.ts)) return null;
  const sides = raw.sides == null ? null : isDieSides(raw.sides) ? raw.sides : null;
  const value =
    typeof raw.value === "number" && Number.isInteger(raw.value) && raw.value > 0 ? raw.value : null;
  return {
    v: 1,
    phase,
    crawlerId: raw.crawlerId,
    name: typeof raw.name === "string" ? raw.name : "",
    sides,
    value,
    emotion: parseAvatarEmotion(raw.emotion),
    portraitUrl: typeof raw.portraitUrl === "string" ? raw.portraitUrl : null,
    ts: raw.ts,
  };
}

export function reduceSceneDice(prev: SceneDiceState | null, ev: SceneDiceEvent): SceneDiceState | null {
  if (prev && ev.ts < prev.ts) return prev;

  if (ev.phase === "close") {
    if (!prev) return null;
    if (prev.crawlerId !== ev.crawlerId) return prev;
    return null;
  }

  if (ev.phase === "idle") {
    if (prev?.mode === "choosing" && prev.crawlerId === ev.crawlerId) return null;
    return prev;
  }

  if (ev.phase === "choosing") {
    if (prev?.mode === "ceremony" && prev.crawlerId !== ev.crawlerId) return prev;
    return {
      mode: "choosing",
      crawlerId: ev.crawlerId,
      name: ev.name,
      emotion: ev.emotion,
      portraitUrl: ev.portraitUrl,
      ts: ev.ts,
    };
  }

  if (ev.phase === "ready") {
    if (!isDieSides(ev.sides)) return prev;
    return {
      mode: "ceremony",
      crawlerId: ev.crawlerId,
      name: ev.name,
      sides: ev.sides,
      value: null,
      emotion: ev.emotion,
      portraitUrl: ev.portraitUrl,
      ts: ev.ts,
    };
  }

  if (ev.phase === "result") {
    if (!isDieSides(ev.sides) || ev.value == null) return prev;
    if (prev?.mode === "ceremony" && prev.crawlerId !== ev.crawlerId) return prev;
    return {
      mode: "ceremony",
      crawlerId: ev.crawlerId,
      name: ev.name || prev?.name || "",
      sides: ev.sides,
      value: ev.value,
      emotion: ev.emotion ?? (prev?.mode === "ceremony" ? prev.emotion : null),
      portraitUrl: ev.portraitUrl ?? (prev?.mode === "ceremony" ? prev.portraitUrl : null),
      ts: ev.ts,
    };
  }

  return prev;
}
