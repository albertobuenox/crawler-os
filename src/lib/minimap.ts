import type {
  MinimapDoc,
  MinimapFixture,
  MinimapFixtureKind,
  MinimapPoint,
  MinimapStroke,
  MinimapStrokeTool,
  MinimapToken,
  MinimapTokenKind,
} from "./types";

export const MINIMAP_TOKEN_KINDS: MinimapTokenKind[] = ["player", "npc", "enemy"];
export const MINIMAP_FIXTURE_KINDS: MinimapFixtureKind[] = ["door", "obstacle"];

export const MINIMAP_TOKEN_LABEL: Record<MinimapTokenKind, string> = {
  player: "Jugador",
  npc: "NPC",
  enemy: "Enemigo",
};

export const MINIMAP_FIXTURE_LABEL: Record<MinimapFixtureKind, string> = {
  door: "Puerta",
  obstacle: "Obstáculo",
};

export const MINIMAP_DOT = {
  self: "var(--text-1)",
  ally: "var(--gold-400)",
  enemy: "var(--danger)",
} as const;

const TOKEN_HIT = 0.032;
const FIXTURE_HIT = 0.038;
const STROKE_HIT = 0.022;
const MIN_POINT_GAP = 0.01;
const MAX_LABEL = 28;

export function emptyMinimapDoc(sessionId: string): MinimapDoc {
  return {
    session_id: sessionId,
    tokens: [],
    strokes: [],
    fixtures: [],
    updated_at: new Date(0).toISOString(),
  };
}

export function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function newMinimapId() {
  return crypto.randomUUID();
}

export function isMinimapEmpty(doc: MinimapDoc) {
  return doc.tokens.length === 0 && doc.strokes.length === 0 && doc.fixtures.length === 0;
}

export function tokenFill(
  token: MinimapToken,
  viewer: "dm" | "crawler",
  selfId?: string | null
) {
  if (token.kind === "enemy") return MINIMAP_DOT.enemy;
  if (viewer === "crawler" && token.kind === "player" && token.crawler_id && token.crawler_id === selfId) {
    return MINIMAP_DOT.self;
  }
  if (viewer === "dm" && token.kind === "player") return MINIMAP_DOT.self;
  return MINIMAP_DOT.ally;
}

export function makeToken(
  kind: MinimapTokenKind,
  x: number,
  y: number,
  extra?: Partial<Pick<MinimapToken, "label" | "crawler_id">>
): MinimapToken {
  return {
    id: newMinimapId(),
    kind,
    label: sanitizeLabel(extra?.label ?? MINIMAP_TOKEN_LABEL[kind]),
    x: clamp01(x),
    y: clamp01(y),
    crawler_id: extra?.crawler_id ?? null,
  };
}

export function makeFixture(kind: MinimapFixtureKind, x: number, y: number): MinimapFixture {
  return {
    id: newMinimapId(),
    kind,
    x: clamp01(x),
    y: clamp01(y),
    rotation: 0,
  };
}

export function makeStroke(tool: MinimapStrokeTool, points: MinimapPoint[]): MinimapStroke {
  return { id: newMinimapId(), tool, points: simplifyPoints(points) };
}

export function sanitizeLabel(value: string) {
  return value.trim().slice(0, MAX_LABEL) || "Ficha";
}

export function simplifyPoints(points: MinimapPoint[]) {
  const out: MinimapPoint[] = [];
  for (const raw of points) {
    const p = { x: clamp01(raw.x), y: clamp01(raw.y) };
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= MIN_POINT_GAP) out.push(p);
  }
  if (out.length === 1 && points.length > 1) {
    const last = points[points.length - 1];
    out.push({ x: clamp01(last.x), y: clamp01(last.y) });
  }
  return out;
}

export function pointsToPath(points: MinimapPoint[]) {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`)
    .join(" ");
}

export type MinimapHit =
  | { type: "token"; id: string }
  | { type: "fixture"; id: string }
  | { type: "stroke"; id: string };

export function hitTestMinimap(doc: MinimapDoc, p: MinimapPoint): MinimapHit | null {
  for (let i = doc.tokens.length - 1; i >= 0; i--) {
    const t = doc.tokens[i];
    if (Math.hypot(p.x - t.x, p.y - t.y) <= TOKEN_HIT) return { type: "token", id: t.id };
  }
  for (let i = doc.fixtures.length - 1; i >= 0; i--) {
    const f = doc.fixtures[i];
    if (Math.hypot(p.x - f.x, p.y - f.y) <= FIXTURE_HIT) return { type: "fixture", id: f.id };
  }
  for (let i = doc.strokes.length - 1; i >= 0; i--) {
    const s = doc.strokes[i];
    if (nearPolyline(p, s.points, STROKE_HIT)) return { type: "stroke", id: s.id };
  }
  return null;
}

function nearPolyline(p: MinimapPoint, points: MinimapPoint[], threshold: number) {
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y) <= threshold;
  for (let i = 1; i < points.length; i++) {
    if (distPointSeg(p, points[i - 1], points[i]) <= threshold) return true;
  }
  return false;
}

function distPointSeg(p: MinimapPoint, a: MinimapPoint, b: MinimapPoint) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function parseMinimapDoc(row: unknown, sessionId: string): MinimapDoc {
  const raw = (row ?? {}) as Record<string, unknown>;
  return {
    session_id: typeof raw.session_id === "string" ? raw.session_id : sessionId,
    tokens: Array.isArray(raw.tokens) ? raw.tokens.map(parseToken).filter((t): t is MinimapToken => !!t) : [],
    strokes: Array.isArray(raw.strokes) ? raw.strokes.map(parseStroke).filter((s): s is MinimapStroke => !!s) : [],
    fixtures: Array.isArray(raw.fixtures)
      ? raw.fixtures.map(parseFixture).filter((f): f is MinimapFixture => !!f)
      : [],
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
  };
}

function parseToken(raw: unknown): MinimapToken | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string") return null;
  const kind = t.kind === "player" || t.kind === "npc" || t.kind === "enemy" ? t.kind : "npc";
  return {
    id: t.id,
    kind,
    label: sanitizeLabel(typeof t.label === "string" ? t.label : MINIMAP_TOKEN_LABEL[kind]),
    x: clamp01(Number(t.x)),
    y: clamp01(Number(t.y)),
    crawler_id: typeof t.crawler_id === "string" ? t.crawler_id : null,
  };
}

function parseStroke(raw: unknown): MinimapStroke | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || !Array.isArray(s.points)) return null;
  const points = s.points
    .map((p) => {
      if (!p || typeof p !== "object") return null;
      const pt = p as Record<string, unknown>;
      return { x: clamp01(Number(pt.x)), y: clamp01(Number(pt.y)) };
    })
    .filter((p): p is MinimapPoint => !!p);
  if (points.length === 0) return null;
  return {
    id: s.id,
    tool: s.tool === "wall" ? "wall" : "draw",
    points,
  };
}

function parseFixture(raw: unknown): MinimapFixture | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== "string") return null;
  const kind = f.kind === "door" || f.kind === "obstacle" ? f.kind : "obstacle";
  const rotation = Number(f.rotation);
  return {
    id: f.id,
    kind,
    x: clamp01(Number(f.x)),
    y: clamp01(Number(f.y)),
    rotation: Number.isFinite(rotation) ? ((rotation % 360) + 360) % 360 : 0,
  };
}

export function placePartyTokens(
  doc: MinimapDoc,
  crawlers: { id: string; name: string }[]
): MinimapDoc {
  const existing = new Set(doc.tokens.map((t) => t.crawler_id).filter(Boolean));
  const missing = crawlers.filter((c) => !existing.has(c.id));
  if (missing.length === 0) return doc;
  const tokens = [...doc.tokens];
  missing.forEach((c, i) => {
    tokens.push(
      makeToken("player", 0.2 + (i % 5) * 0.14, 0.78 + Math.floor(i / 5) * 0.1, {
        label: c.name,
        crawler_id: c.id,
      })
    );
  });
  return { ...doc, tokens };
}

export function eraseAt(doc: MinimapDoc, p: MinimapPoint): MinimapDoc {
  const hit = hitTestMinimap(doc, p);
  if (!hit) return doc;
  if (hit.type === "token") return { ...doc, tokens: doc.tokens.filter((t) => t.id !== hit.id) };
  if (hit.type === "fixture") return { ...doc, fixtures: doc.fixtures.filter((f) => f.id !== hit.id) };
  return { ...doc, strokes: doc.strokes.filter((s) => s.id !== hit.id) };
}
