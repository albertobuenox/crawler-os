import { STAT_LABELS, type EventLogEntry, type EventType, type StatKey } from "@/lib/types";
import { isChatEvent } from "@/lib/chat";
import { clampLifeBoxes } from "@/lib/rules";

export const SCENE_LOG_KIND = {
  roll: "scene_roll",
  vital: "vital",
  stat: "stat",
} as const;

export type SceneLogKind = (typeof SCENE_LOG_KIND)[keyof typeof SCENE_LOG_KIND];
export type SceneVitalField = "hp" | "mana";
export type SceneStatField = StatKey | "level";

export type SceneLogPostBody =
  | {
      kind: typeof SCENE_LOG_KIND.roll;
      sessionId: string;
      crawlerId: string;
      formula: string;
      sides: number;
      value: number;
    }
  | {
      kind: typeof SCENE_LOG_KIND.vital;
      sessionId: string;
      crawlerId: string;
      field: SceneVitalField;
      from: number;
      to: number;
    }
  | {
      kind: typeof SCENE_LOG_KIND.stat;
      sessionId: string;
      crawlerId: string;
      stat: SceneStatField;
      from: number;
      to: number;
    };

export type SceneLogItem =
  | {
      kind: "scene_roll";
      id: string;
      created_at: string;
      event_type: EventType;
      crawlerId: string | null;
      crawlerName: string;
      formula: string;
      value: number;
      sides: number | null;
    }
  | {
      kind: "vital";
      id: string;
      created_at: string;
      event_type: EventType;
      crawlerId: string | null;
      crawlerName: string;
      field: SceneVitalField;
      from: number;
      to: number;
      amount: number;
    }
  | {
      kind: "stat";
      id: string;
      created_at: string;
      event_type: EventType;
      crawlerId: string | null;
      crawlerName: string;
      stat: SceneStatField;
      from: number;
      to: number;
      amount: number;
    }
  | {
      kind: "plain";
      id: string;
      created_at: string;
      event_type: EventType;
      crawlerId: string | null;
      crawlerName: string | null;
      message: string;
    };

const VITAL_DEBOUNCE_MS = 700;

type PendingVital = {
  sessionId: string;
  crawlerId: string;
  field: SceneVitalField;
  from: number;
  to: number;
  timer: ReturnType<typeof setTimeout>;
};

const pendingVitals = new Map<string, PendingVital>();

export function isSceneLogEvent(entry: Pick<EventLogEntry, "payload"> | null | undefined): boolean {
  if (!entry || isChatEvent(entry)) return false;
  const kind = entry.payload?.kind;
  return kind === SCENE_LOG_KIND.roll || kind === SCENE_LOG_KIND.vital || kind === SCENE_LOG_KIND.stat;
}

const RELEVANT_EVENT_TYPES = new Set<EventType>([
  "ROLL",
  "COMBAT",
  "REWARD",
  "PENALTY",
  "ACHIEVEMENT",
]);

export function isSceneLogRelevant(entry: EventLogEntry): boolean {
  if (isChatEvent(entry)) return false;
  if (isSceneLogEvent(entry)) return true;
  return RELEVANT_EVENT_TYPES.has(entry.event_type);
}

export function sceneLogEventType(kind: SceneLogKind, extra?: { field?: SceneVitalField }): EventType {
  if (kind === SCENE_LOG_KIND.roll) return "ROLL";
  if (kind === SCENE_LOG_KIND.vital && extra?.field === "hp") return "COMBAT";
  return "SYSTEM";
}

export function sceneStatLabel(stat: SceneStatField): string {
  if (stat === "level") return "NIVEL";
  return STAT_LABELS[stat];
}

export function sceneVitalLabel(field: SceneVitalField): string {
  return field === "hp" ? "HP" : "maná";
}

export function sceneLogMessage(
  input: SceneLogPostBody,
  crawlerName: string
): string {
  const who = `Mazmorrero ${crawlerName}`;
  if (input.kind === SCENE_LOG_KIND.roll) {
    return `${who} lanzó ${input.formula} = ${input.value}`;
  }
  const amount = Math.abs(input.to - input.from);
  if (input.kind === SCENE_LOG_KIND.vital) {
    const verb = input.to < input.from ? "ha perdido" : "ha recuperado";
    return `${who} ${verb} ${amount} de ${sceneVitalLabel(input.field)}`;
  }
  const verb = input.to < input.from ? "ha bajado" : "ha subido";
  return `${who} ${verb} ${sceneStatLabel(input.stat)} en ${amount}`;
}

export function upsertSceneLogEntry(list: EventLogEntry[], incoming: EventLogEntry): EventLogEntry[] {
  if (isChatEvent(incoming)) return list;
  if (list.some((e) => e.id === incoming.id)) return list;
  const next = [...list, incoming];
  next.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return next;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asVitalField(value: unknown): SceneVitalField | null {
  return value === "hp" || value === "mana" ? value : null;
}

function asStatField(value: unknown): SceneStatField | null {
  if (value === "level") return "level";
  if (value === "str" || value === "int" || value === "con" || value === "dex" || value === "cha") {
    return value;
  }
  return null;
}

export function sceneLogFromEvent(
  row: EventLogEntry,
  names: Record<string, string> = {}
): SceneLogItem | null {
  if (!isSceneLogRelevant(row)) return null;
  const payload = row.payload ?? {};
  const crawlerId =
    str(payload.crawler_id) ??
    row.target_crawler_id ??
    str(payload.author_crawler_id);
  const crawlerName =
    str(payload.crawler_name) ??
    (crawlerId ? names[crawlerId] : null) ??
    str(payload.author_name) ??
    "Crawler";

  if (payload.kind === SCENE_LOG_KIND.roll) {
    const value = num(payload.value);
    const formula = str(payload.formula) ?? "1d20";
    if (value == null) return null;
    return {
      kind: "scene_roll",
      id: row.id,
      created_at: row.created_at,
      event_type: row.event_type,
      crawlerId,
      crawlerName,
      formula,
      value,
      sides: num(payload.sides),
    };
  }

  if (payload.kind === SCENE_LOG_KIND.vital) {
    const field = asVitalField(payload.field);
    const from = num(payload.from);
    const to = num(payload.to);
    if (!field || from == null || to == null || from === to) return null;
    return {
      kind: "vital",
      id: row.id,
      created_at: row.created_at,
      event_type: row.event_type,
      crawlerId,
      crawlerName,
      field,
      from,
      to,
      amount: Math.abs(to - from),
    };
  }

  if (payload.kind === SCENE_LOG_KIND.stat) {
    const stat = asStatField(payload.stat);
    const from = num(payload.from);
    const to = num(payload.to);
    if (!stat || from == null || to == null || from === to) return null;
    return {
      kind: "stat",
      id: row.id,
      created_at: row.created_at,
      event_type: row.event_type,
      crawlerId,
      crawlerName,
      stat,
      from,
      to,
      amount: Math.abs(to - from),
    };
  }

  if (row.event_type === "ROLL") {
    const value = num(payload.total);
    if (value != null) {
      return {
        kind: "scene_roll",
        id: row.id,
        created_at: row.created_at,
        event_type: row.event_type,
        crawlerId,
        crawlerName,
        formula: str(payload.formula) ?? "1d20",
        value,
        sides: num(payload.sides),
      };
    }
  }

  return {
    kind: "plain",
    id: row.id,
    created_at: row.created_at,
    event_type: row.event_type,
    crawlerId,
    crawlerName: crawlerId ? crawlerName : null,
    message: row.message,
  };
}

export async function postSceneLog(input: SceneLogPostBody): Promise<boolean> {
  try {
    const res = await fetch("/api/scene-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function vitalKey(crawlerId: string, field: SceneVitalField) {
  return `${crawlerId}:${field}`;
}

function flushVital(key: string) {
  const pending = pendingVitals.get(key);
  if (!pending) return;
  pendingVitals.delete(key);
  if (pending.from === pending.to) return;
  void postSceneLog({
    kind: SCENE_LOG_KIND.vital,
    sessionId: pending.sessionId,
    crawlerId: pending.crawlerId,
    field: pending.field,
    from: pending.from,
    to: pending.to,
  });
}

export function queueVitalLog(input: {
  sessionId: string;
  crawlerId: string;
  field: SceneVitalField;
  from: number;
  to: number;
}) {
  if (input.from === input.to) return;
  const key = vitalKey(input.crawlerId, input.field);
  const existing = pendingVitals.get(key);
  if (existing) {
    existing.to = input.to;
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => flushVital(key), VITAL_DEBOUNCE_MS);
    return;
  }
  pendingVitals.set(key, {
    ...input,
    timer: setTimeout(() => flushVital(key), VITAL_DEBOUNCE_MS),
  });
}

export function queueVitalsFromSnapshot(
  crawlerId: string,
  snapshot: { session_id: string; hp_boxes_filled: number; mana_current: number },
  patch: { hp_boxes_filled?: number; mana_current?: number }
) {
  if (patch.hp_boxes_filled !== undefined) {
    queueVitalLog({
      sessionId: snapshot.session_id,
      crawlerId,
      field: "hp",
      from: clampLifeBoxes(10 - snapshot.hp_boxes_filled),
      to: clampLifeBoxes(10 - patch.hp_boxes_filled),
    });
  }
  if (patch.mana_current !== undefined) {
    queueVitalLog({
      sessionId: snapshot.session_id,
      crawlerId,
      field: "mana",
      from: snapshot.mana_current,
      to: patch.mana_current,
    });
  }
}

export function logCrawlerStatDiffs(input: {
  sessionId: string;
  crawlerId: string;
  before: Partial<Record<`${StatKey}_base` | "level", number>>;
  after: Partial<Record<`${StatKey}_base` | "level", number>>;
}) {
  const stats: SceneStatField[] = ["str", "int", "con", "dex", "cha", "level"];
  for (const stat of stats) {
    const from = stat === "level" ? input.before.level : input.before[`${stat}_base`];
    const to = stat === "level" ? input.after.level : input.after[`${stat}_base`];
    if (typeof from !== "number" || typeof to !== "number" || from === to) continue;
    void postSceneLog({
      kind: SCENE_LOG_KIND.stat,
      sessionId: input.sessionId,
      crawlerId: input.crawlerId,
      stat,
      from,
      to,
    });
  }
}

export function crawlerSheetHref(crawlerId: string, viewer: "dm" | "crawler") {
  return viewer === "dm" ? `/dm/crawlers/${crawlerId}` : `/crawler/sheet/${crawlerId}`;
}
