import { crawlerAvatarUrl, crawlerFullBodyUrl } from "@/lib/crawler-art";
import type { SceneCanvasDoc, SceneMapLayer, SceneToken, SceneTokenKind } from "@/lib/types";

export const SCENE_ZOOM_MIN = 0.35;
export const SCENE_ZOOM_MAX = 3.2;
export const SCENE_TOKEN_SIZE = 0.09;
export const SCENE_MAP_BASE = 0.92;
export const SCENE_WORLD_MIN = -2;
export const SCENE_WORLD_MAX = 3;

export type SceneHit =
  | { type: "token"; id: string }
  | { type: "map"; id: string };

export type SceneCrawlerOpt = {
  id: string;
  name: string;
  portrait_url?: string | null;
  avatar_emotion?: string | null;
};

export function emptySceneCanvas(): SceneCanvasDoc {
  return {
    maps: [],
    tokens: [],
    pan_x: 0.5,
    pan_y: 0.5,
    zoom: 1,
    updated_at: new Date(0).toISOString(),
  };
}

export function newSceneId() {
  return crypto.randomUUID();
}

export function clampSceneZoom(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.min(SCENE_ZOOM_MAX, Math.max(SCENE_ZOOM_MIN, n));
}

export function clampWorld(n: number) {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(SCENE_WORLD_MAX, Math.max(SCENE_WORLD_MIN, n));
}

export function isSceneCanvasEmpty(doc: SceneCanvasDoc) {
  return doc.maps.length === 0 && doc.tokens.length === 0;
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function parseMap(raw: unknown, index: number): SceneMapLayer | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const image_url = asString(row.image_url);
  if (!image_url) return null;
  return {
    id: asString(row.id) || newSceneId(),
    image_url,
    name: asString(row.name, `Mapa ${index + 1}`),
    x: clampWorld(asNumber(row.x, 0.5)),
    y: clampWorld(asNumber(row.y, 0.5)),
    scale: Math.min(4, Math.max(0.15, asNumber(row.scale, 1))),
    rotation: asNumber(row.rotation, 0),
    natural_w: Math.max(1, asNumber(row.natural_w, 1600)),
    natural_h: Math.max(1, asNumber(row.natural_h, 900)),
    z: asNumber(row.z, index),
  };
}

function parseToken(raw: unknown, index: number): SceneToken | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const kind: SceneTokenKind = row.kind === "enemy" ? "enemy" : "player";
  return {
    id: asString(row.id) || newSceneId(),
    kind,
    label: asString(row.label, kind === "enemy" ? "Enemigo" : "Crawler"),
    x: clampWorld(asNumber(row.x, 0.5)),
    y: clampWorld(asNumber(row.y, 0.5)),
    size: Math.min(0.28, Math.max(0.04, asNumber(row.size, SCENE_TOKEN_SIZE))),
    rotation: asNumber(row.rotation, 0),
    sprite_url: typeof row.sprite_url === "string" ? row.sprite_url : null,
    crawler_id: typeof row.crawler_id === "string" ? row.crawler_id : null,
    resource_id: typeof row.resource_id === "string" ? row.resource_id : null,
    mob_id: typeof row.mob_id === "string" ? row.mob_id : null,
    z: asNumber(row.z, 100 + index),
  };
}

export function parseSceneCanvas(raw: unknown): SceneCanvasDoc {
  if (!raw || typeof raw !== "object") return emptySceneCanvas();
  const row = raw as Record<string, unknown>;
  const maps = Array.isArray(row.maps)
    ? row.maps.map(parseMap).filter((m): m is SceneMapLayer => !!m)
    : [];
  const tokens = Array.isArray(row.tokens)
    ? row.tokens.map(parseToken).filter((t): t is SceneToken => !!t)
    : [];
  return {
    maps,
    tokens,
    pan_x: clampWorld(asNumber(row.pan_x, 0.5)),
    pan_y: clampWorld(asNumber(row.pan_y, 0.5)),
    zoom: clampSceneZoom(asNumber(row.zoom, 1)),
    updated_at: asString(row.updated_at, new Date(0).toISOString()),
  };
}

export function stampSceneCanvas(doc: SceneCanvasDoc): SceneCanvasDoc {
  return { ...doc, updated_at: new Date().toISOString() };
}

export function makeSceneMap(partial: {
  image_url: string;
  name?: string;
  x?: number;
  y?: number;
  scale?: number;
  natural_w?: number;
  natural_h?: number;
}): SceneMapLayer {
  return {
    id: newSceneId(),
    image_url: partial.image_url,
    name: partial.name?.trim() || "Mapa",
    x: clampWorld(partial.x ?? 0.5),
    y: clampWorld(partial.y ?? 0.5),
    scale: partial.scale ?? 1,
    rotation: 0,
    natural_w: partial.natural_w ?? 1600,
    natural_h: partial.natural_h ?? 900,
    z: Date.now() % 100000,
  };
}

export function makeSceneToken(
  kind: SceneTokenKind,
  x: number,
  y: number,
  extra?: Partial<Pick<SceneToken, "label" | "sprite_url" | "crawler_id" | "resource_id" | "mob_id" | "size">>
): SceneToken {
  return {
    id: newSceneId(),
    kind,
    label: extra?.label?.trim() || (kind === "enemy" ? "Enemigo" : "Crawler"),
    x: clampWorld(x),
    y: clampWorld(y),
    size: extra?.size ?? SCENE_TOKEN_SIZE,
    rotation: 0,
    sprite_url: extra?.sprite_url ?? null,
    crawler_id: extra?.crawler_id ?? null,
    resource_id: extra?.resource_id ?? null,
    mob_id: extra?.mob_id ?? null,
    z: 1000 + (Date.now() % 100000),
  };
}

export function playerSpriteUrl(
  crawler: SceneCrawlerOpt,
  variant: "avatar" | "full" = "avatar"
) {
  if (variant === "full") {
    return crawlerFullBodyUrl(crawler.name) ?? crawlerAvatarUrl(crawler.name, crawler.portrait_url);
  }
  return crawlerAvatarUrl(crawler.name, crawler.portrait_url);
}

export function canMoveSceneToken(
  token: SceneToken,
  role: "dm" | "crawler",
  selfId?: string | null
) {
  if (role === "dm") return true;
  return token.kind === "player" && !!token.crawler_id && token.crawler_id === selfId;
}

export function nextZ(doc: SceneCanvasDoc, kind: "map" | "token") {
  const pool = kind === "map" ? doc.maps : doc.tokens;
  return pool.reduce((max, item) => Math.max(max, item.z), kind === "map" ? 0 : 100) + 1;
}

export function bringSceneToFront(doc: SceneCanvasDoc, hit: SceneHit): SceneCanvasDoc {
  if (hit.type === "map") {
    const z = nextZ(doc, "map");
    return { ...doc, maps: doc.maps.map((m) => (m.id === hit.id ? { ...m, z } : m)) };
  }
  const z = nextZ(doc, "token");
  return { ...doc, tokens: doc.tokens.map((t) => (t.id === hit.id ? { ...t, z } : t)) };
}

export function patchSceneToken(
  doc: SceneCanvasDoc,
  id: string,
  patch: Partial<SceneToken>
): SceneCanvasDoc {
  return {
    ...doc,
    tokens: doc.tokens.map((t) => (t.id === id ? { ...t, ...patch, id: t.id } : t)),
  };
}

export function patchSceneMap(
  doc: SceneCanvasDoc,
  id: string,
  patch: Partial<SceneMapLayer>
): SceneCanvasDoc {
  return {
    ...doc,
    maps: doc.maps.map((m) => (m.id === id ? { ...m, ...patch, id: m.id } : m)),
  };
}

export function removeSceneItem(doc: SceneCanvasDoc, hit: SceneHit): SceneCanvasDoc {
  if (hit.type === "map") return { ...doc, maps: doc.maps.filter((m) => m.id !== hit.id) };
  return { ...doc, tokens: doc.tokens.filter((t) => t.id !== hit.id) };
}

export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  cam: Pick<SceneCanvasDoc, "pan_x" | "pan_y" | "zoom">
) {
  const nx = rect.width <= 0 ? 0.5 : (clientX - rect.left) / rect.width;
  const ny = rect.height <= 0 ? 0.5 : (clientY - rect.top) / rect.height;
  return {
    x: cam.pan_x + (nx - 0.5) / cam.zoom,
    y: cam.pan_y + (ny - 0.5) / cam.zoom,
  };
}

export function worldToScreen(
  world: { x: number; y: number },
  rect: { width: number; height: number },
  cam: Pick<SceneCanvasDoc, "pan_x" | "pan_y" | "zoom">
) {
  return {
    x: ((world.x - cam.pan_x) * cam.zoom + 0.5) * rect.width,
    y: ((world.y - cam.pan_y) * cam.zoom + 0.5) * rect.height,
  };
}

export function mapSizePx(
  layer: SceneMapLayer,
  viewport: { width: number; height: number },
  zoom: number
) {
  const width = layer.scale * SCENE_MAP_BASE * viewport.width * zoom;
  const aspect = layer.natural_h / layer.natural_w;
  return { width, height: width * aspect };
}

export function tokenSizePx(token: SceneToken, viewport: { width: number; height: number }, zoom: number) {
  const unit = Math.min(viewport.width, viewport.height);
  return token.size * unit * zoom;
}

function pointInRect(
  px: number,
  py: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotation: number
) {
  if (!rotation) {
    return Math.abs(px - cx) <= w / 2 && Math.abs(py - cy) <= h / 2;
  }
  const rad = (-rotation * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
}

export function hitTestScene(
  doc: SceneCanvasDoc,
  world: { x: number; y: number },
  viewport: { width: number; height: number }
): SceneHit | null {
  const tokens = [...doc.tokens].sort((a, b) => b.z - a.z);
  for (const token of tokens) {
    const px = tokenSizePx(token, viewport, 1);
    const w = px / viewport.width;
    const h = px / viewport.height;
    if (pointInRect(world.x, world.y, token.x, token.y, w, h, token.rotation)) {
      return { type: "token", id: token.id };
    }
  }
  const maps = [...doc.maps].sort((a, b) => b.z - a.z);
  for (const layer of maps) {
    const size = mapSizePx(layer, viewport, 1);
    const w = size.width / viewport.width;
    const h = size.height / viewport.height;
    if (pointInRect(world.x, world.y, layer.x, layer.y, w, h, layer.rotation)) {
      return { type: "map", id: layer.id };
    }
  }
  return null;
}

export function zoomAround(
  doc: SceneCanvasDoc,
  world: { x: number; y: number },
  nextZoom: number
): SceneCanvasDoc {
  const zoom = clampSceneZoom(nextZoom);
  return {
    ...doc,
    zoom,
    pan_x: clampWorld(world.x - ((world.x - doc.pan_x) * doc.zoom) / zoom),
    pan_y: clampWorld(world.y - ((world.y - doc.pan_y) * doc.zoom) / zoom),
  };
}

export function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 1600, height: img.naturalHeight || 900 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 1600, height: 900 });
    };
    img.src = url;
  });
}
