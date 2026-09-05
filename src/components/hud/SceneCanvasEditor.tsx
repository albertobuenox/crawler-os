"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, ImagePlus, MousePointer2, Skull, Trash2, User, ZoomIn, ZoomOut } from "lucide-react";
import { SceneStage, type SceneStageTool } from "@/components/hud/SceneStage";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { useSceneCanvas } from "@/hooks/useSceneCanvas";
import {
  bringSceneToFront,
  clampSceneZoom,
  makeSceneMap,
  makeSceneToken,
  playerSpriteUrl,
  readImageSize,
  removeSceneItem,
  type SceneCrawlerOpt,
  type SceneHit,
} from "@/lib/scene-canvas";
import { crawlerAvatarUrl } from "@/lib/crawler-art";
import type { Resource, SceneCanvasDoc, SceneToken } from "@/lib/types";
import { cn } from "@/lib/utils";

type Stamp =
  | { type: "player"; crawler: SceneCrawlerOpt; variant: "avatar" | "full" }
  | { type: "enemy"; resource: Resource };

export function SceneCanvasEditor({
  sessionId,
  crawlers,
  monsters,
  maps = [],
}: {
  sessionId: string;
  crawlers: SceneCrawlerOpt[];
  monsters: Resource[];
  maps?: Resource[];
}) {
  const { doc, ready, error, commit, setBusy } = useSceneCanvas(sessionId, { role: "dm" });
  const [tool, setTool] = useState<SceneStageTool>("select");
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [selected, setSelected] = useState<SceneHit | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const map = doc;

  function apply(next: SceneCanvasDoc, immediate = false) {
    commit(next, immediate);
  }

  async function uploadFile(file: File, kind: "map" | "sprite") {
    const body = new FormData();
    body.set("file", file);
    body.set("kind", kind);
    body.set("session_id", sessionId);
    const res = await fetch("/api/dm/scene-assets", { method: "POST", body });
    const json = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error || "No se pudo subir.");
    return json.url;
  }

  async function onUploadMap(file: File) {
    if (!map) return;
    setUploadError("");
    setUploading(true);
    try {
      const [url, size] = await Promise.all([uploadFile(file, "map"), readImageSize(file)]);
      const layer = makeSceneMap({
        image_url: url,
        name: file.name.replace(/\.[^.]+$/, ""),
        x: map.pan_x,
        y: map.pan_y,
        natural_w: size.width,
        natural_h: size.height,
      });
      apply({ ...map, maps: [...map.maps, layer] }, true);
      setSelected({ type: "map", id: layer.id });
      setTool("select");
      setStamp(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "El Sistema rechazó el archivo.");
    } finally {
      setUploading(false);
    }
  }

  function placeAt(world: { x: number; y: number }) {
    if (!map || !stamp) return;
    if (stamp.type === "player") {
      const token = makeSceneToken("player", world.x, world.y, {
        label: stamp.crawler.name,
        crawler_id: stamp.crawler.id,
        sprite_url: playerSpriteUrl(stamp.crawler, stamp.variant),
      });
      apply({ ...map, tokens: [...map.tokens, token] }, true);
      setSelected({ type: "token", id: token.id });
    } else {
      const token = makeSceneToken("enemy", world.x, world.y, {
        label: stamp.resource.name,
        resource_id: stamp.resource.id,
        sprite_url: stamp.resource.icon_url,
      });
      apply({ ...map, tokens: [...map.tokens, token] }, true);
      setSelected({ type: "token", id: token.id });
    }
    setStamp(null);
    setTool("select");
  }

  async function onCustomSprite(file: File, token: SceneToken) {
    if (!map) return;
    setUploading(true);
    setUploadError("");
    try {
      const url = await uploadFile(file, "sprite");
      apply(
        { ...map, tokens: map.tokens.map((t) => (t.id === token.id ? { ...t, sprite_url: url } : t)) },
        true
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "El Sistema rechazó el sprite.");
    } finally {
      setUploading(false);
    }
  }

  const selectedMap = selected?.type === "map" ? map?.maps.find((m) => m.id === selected.id) : null;
  const selectedToken = selected?.type === "token" ? map?.tokens.find((t) => t.id === selected.id) : null;

  useEffect(() => {
    if (!selected) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      const target = e.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (!map || !selected) return;
      apply(removeSceneItem(map, selected), true);
      setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map, selected]);

  if (!ready || !map) {
    return <div className="well min-h-[320px] animate-pulse" />;
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_240px] gap-3">
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <ToolButton
            label="Seleccionar"
            active={tool === "select" && !stamp}
            onClick={() => {
              setTool("select");
              setStamp(null);
            }}
          >
            <MousePointer2 size={14} />
          </ToolButton>
          <ToolButton
            label="Mover marco"
            active={tool === "pan"}
            onClick={() => {
              setTool("pan");
              setStamp(null);
            }}
          >
            <Hand size={14} />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-[var(--stroke-glass)]" />
          <ToolButton
            label="Alejar"
            onClick={() => apply({ ...map, zoom: clampSceneZoom(map.zoom / 1.15) }, true)}
          >
            <ZoomOut size={14} />
          </ToolButton>
          <span className="min-w-[2.5rem] text-center font-stat text-xs text-[var(--cyan-400)]">
            {Math.round(map.zoom * 100)}%
          </span>
          <ToolButton
            label="Acercar"
            onClick={() => apply({ ...map, zoom: clampSceneZoom(map.zoom * 1.15) }, true)}
          >
            <ZoomIn size={14} />
          </ToolButton>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => apply({ ...map, pan_x: 0.5, pan_y: 0.5, zoom: 1 }, true)}
          >
            Recentrar
          </Button>
        </div>
        <SceneStage
          doc={map}
          mode="edit"
          role="dm"
          selectedId={selected?.id ?? null}
          tool={stamp ? "place" : tool}
          placing={!!stamp}
          className="min-h-0 flex-1"
          onSelect={setSelected}
          onCommit={(next, immediate) => apply(next, immediate)}
          onBusy={setBusy}
          onPlace={placeAt}
        />
        <p className="font-mono text-[10px] tracking-wide text-[var(--text-4)]">
          Espacio + arrastrar o rueda: cámara. Los crawlers ven este marco en vivo.
        </p>
        {(error || uploadError) && (
          <p className="text-xs text-[var(--danger)]">{uploadError || error}</p>
        )}
      </div>

      <aside className="flex min-h-0 flex-col gap-3 overflow-auto">
        <section className="glass p-3">
          <p className="text-label text-[var(--cyan-400)]">Mapa</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/webp,image/png,image/jpeg,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onUploadMap(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "mt-2 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed px-3 py-3",
              "font-display text-[11px] tracking-wide text-[var(--cyan-300)]",
              "border-[var(--stroke-cyan)] hover:border-[var(--stroke-cyan-hot)] hover:shadow-[var(--glow-cyan)]",
              uploading && "opacity-45"
            )}
          >
            <ImagePlus size={16} />
            {uploading ? "Subiendo…" : "Subir mapa"}
          </button>
          {maps.some((m) => m.icon_url) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {maps
                .filter((m) => m.icon_url)
                .map((resource) => (
                  <button
                    key={resource.id}
                    type="button"
                    onClick={() => {
                      if (!map || !resource.icon_url) return;
                      const layer = makeSceneMap({
                        image_url: resource.icon_url,
                        name: resource.name,
                        x: map.pan_x,
                        y: map.pan_y,
                      });
                      apply({ ...map, maps: [...map.maps, layer] }, true);
                      setSelected({ type: "map", id: layer.id });
                    }}
                    className="flex flex-col items-center gap-1 rounded-[14px] border border-[var(--stroke-glass)] p-2 text-center hover:border-[var(--stroke-cyan)]"
                  >
                    <span className="relative h-12 w-12 overflow-hidden rounded-[10px] bg-[rgba(8,10,18,0.8)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={resource.icon_url ?? ""} alt="" className="h-full w-full object-cover" />
                    </span>
                    <span className="w-full truncate font-display text-[10px] tracking-wide">{resource.name}</span>
                  </button>
                ))}
            </div>
          )}
        </section>

        <section className="glass p-3">
          <p className="text-label text-[var(--cyan-400)]">Crawlers</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {crawlers.length === 0 && (
              <p className="col-span-2 text-xs text-[var(--text-3)]">No hay crawlers en la sesión.</p>
            )}
            {crawlers.map((crawler) => {
              const active = stamp?.type === "player" && stamp.crawler.id === crawler.id;
              const src = crawlerAvatarUrl(crawler.name, crawler.portrait_url);
              return (
                <button
                  key={crawler.id}
                  type="button"
                  onClick={() => {
                    setStamp({ type: "player", crawler, variant: "avatar" });
                    setTool("place");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[14px] border p-2 text-center",
                    active
                      ? "border-[var(--stroke-cyan-hot)] shadow-[var(--glow-cyan)]"
                      : "border-[var(--stroke-glass)] hover:border-[var(--stroke-cyan)]"
                  )}
                >
                  <span className="relative h-12 w-12 overflow-hidden rounded-[10px] bg-[rgba(8,10,18,0.8)]">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User className="m-auto mt-3 text-[var(--text-3)]" size={20} />
                    )}
                  </span>
                  <span className="w-full truncate font-display text-[10px] tracking-wide">{crawler.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass p-3">
          <p className="text-label text-[var(--cyan-400)]">Enemigos</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {monsters.length === 0 && (
              <p className="col-span-2 text-xs text-[var(--text-3)]">
                Genera monstruos en Recursos y asígnales un sprite.
              </p>
            )}
            {monsters.map((monster) => {
              const active = stamp?.type === "enemy" && stamp.resource.id === monster.id;
              return (
                <button
                  key={monster.id}
                  type="button"
                  onClick={() => {
                    setStamp({ type: "enemy", resource: monster });
                    setTool("place");
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-[14px] border p-2 text-center",
                    active
                      ? "border-[var(--stroke-danger)] shadow-[var(--glow-danger)]"
                      : "border-[var(--stroke-glass)] hover:border-[var(--stroke-danger)]"
                  )}
                >
                  <span className="relative h-12 w-12 overflow-hidden rounded-[10px] bg-[rgba(8,10,18,0.8)]">
                    {monster.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={monster.icon_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Skull className="m-auto mt-3 text-[var(--danger)]" size={20} />
                    )}
                  </span>
                  <span className="w-full truncate font-display text-[10px] tracking-wide">{monster.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="glass p-3">
          <p className="text-label text-[var(--cyan-400)]">Seleccionado</p>
          {!selectedMap && !selectedToken && (
            <p className="mt-2 text-xs text-[var(--text-3)]">Pincha un mapa o una ficha.</p>
          )}
          {selectedMap && (
            <div className="mt-3 space-y-3">
              <Input
                label="Nombre"
                value={selectedMap.name}
                onChange={(e) =>
                  apply({
                    ...map,
                    maps: map.maps.map((m) => (m.id === selectedMap.id ? { ...m, name: e.target.value } : m)),
                  })
                }
              />
              <label className="text-label">Escala</label>
              <input
                type="range"
                min={0.2}
                max={2.8}
                step={0.05}
                value={selectedMap.scale}
                onChange={(e) =>
                  apply({
                    ...map,
                    maps: map.maps.map((m) =>
                      m.id === selectedMap.id ? { ...m, scale: Number(e.target.value) } : m
                    ),
                  })
                }
              />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => apply(bringSceneToFront(map, { type: "map", id: selectedMap.id }), true)}
                >
                  Al frente
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    apply(removeSceneItem(map, { type: "map", id: selectedMap.id }), true);
                    setSelected(null);
                  }}
                >
                  <Trash2 size={14} /> Quitar
                </Button>
              </div>
            </div>
          )}
          {selectedToken && (
            <TokenInspector
              token={selectedToken}
              crawlers={crawlers}
              uploading={uploading}
              onChange={(patch) =>
                apply({
                  ...map,
                  tokens: map.tokens.map((t) => (t.id === selectedToken.id ? { ...t, ...patch } : t)),
                })
              }
              onSpriteFile={(file) => void onCustomSprite(file, selectedToken)}
              onDelete={() => {
                apply(removeSceneItem(map, { type: "token", id: selectedToken.id }), true);
                setSelected(null);
              }}
            />
          )}
        </section>
      </aside>
    </div>
  );
}

function TokenInspector({
  token,
  crawlers,
  uploading,
  onChange,
  onSpriteFile,
  onDelete,
}: {
  token: SceneToken;
  crawlers: SceneCrawlerOpt[];
  uploading: boolean;
  onChange: (patch: Partial<SceneToken>) => void;
  onSpriteFile: (file: File) => void;
  onDelete: () => void;
}) {
  const spriteRef = useRef<HTMLInputElement>(null);
  const linked = crawlers.find((c) => c.id === token.crawler_id);

  return (
    <div className="mt-3 space-y-3">
      <Input label="Etiqueta" value={token.label} onChange={(e) => onChange({ label: e.target.value })} />
      {token.kind === "player" && (
        <Select
          label="Crawler"
          value={token.crawler_id ?? ""}
          onChange={(e) => {
            const crawler = crawlers.find((c) => c.id === e.target.value);
            onChange({
              crawler_id: e.target.value || null,
              label: crawler?.name ?? token.label,
              sprite_url: crawler ? playerSpriteUrl(crawler, "avatar") : token.sprite_url,
            });
          }}
          options={[
            { value: "", label: "Sin vincular" },
            ...crawlers.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      )}
      {linked && (
        <div className="flex gap-2">
          <Button variant="neon" size="sm" onClick={() => onChange({ sprite_url: playerSpriteUrl(linked, "avatar") })}>
            Avatar
          </Button>
          <Button variant="neon" size="sm" onClick={() => onChange({ sprite_url: playerSpriteUrl(linked, "full") })}>
            Cuerpo
          </Button>
        </div>
      )}
      <Button variant="ghost" size="sm" disabled={uploading} onClick={() => spriteRef.current?.click()}>
        Subir sprite
      </Button>
      <input
        ref={spriteRef}
        type="file"
        accept="image/webp,image/png,image/jpeg,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onSpriteFile(file);
        }}
      />
      <label className="text-label">Tamaño</label>
      <input
        type="range"
        min={0.05}
        max={0.22}
        step={0.01}
        value={token.size}
        onChange={(e) => onChange({ size: Number(e.target.value) })}
      />
      <Button variant="danger" size="sm" onClick={onDelete}>
        <Trash2 size={14} /> Quitar ficha
      </Button>
    </div>
  );
}

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-[10px] border px-2 font-display text-[10px] tracking-wide",
        active
          ? "border-[var(--stroke-cyan-hot)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
          : "border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--stroke-cyan)] hover:text-[var(--text-1)]",
        disabled && "opacity-45"
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
