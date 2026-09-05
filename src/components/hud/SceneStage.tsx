"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Skull, User } from "lucide-react";
import type { SceneCanvasDoc, SceneMapLayer, SceneToken } from "@/lib/types";
import {
  bringSceneToFront,
  canMoveSceneToken,
  clampWorld,
  hitTestScene,
  mapSizePx,
  patchSceneMap,
  patchSceneToken,
  screenToWorld,
  tokenSizePx,
  worldToScreen,
  zoomAround,
  type SceneHit,
} from "@/lib/scene-canvas";
import { EMPTY_SCENE_CANVAS_COPY, EMPTY_SCENE_EDITOR_COPY } from "@/lib/copy";
import { cn } from "@/lib/utils";

export type SceneStageMode = "view" | "play" | "edit";
export type SceneStageTool = "select" | "pan" | "place";

type DragState =
  | { mode: "pan"; startX: number; startY: number; panX: number; panY: number }
  | { mode: "token"; id: string; grabX: number; grabY: number }
  | { mode: "map"; id: string; grabX: number; grabY: number };

export function SceneStage({
  doc,
  mode,
  role,
  selfId = null,
  selectedId = null,
  tool = "select",
  placing = false,
  className,
  emptyCopy,
  onSelect,
  onCommit,
  onBusy,
  onPlace,
}: {
  doc: SceneCanvasDoc;
  mode: SceneStageMode;
  role?: "dm" | "crawler";
  selfId?: string | null;
  selectedId?: string | null;
  tool?: SceneStageTool;
  placing?: boolean;
  className?: string;
  emptyCopy?: string;
  onSelect?: (hit: SceneHit | null) => void;
  onCommit?: (next: SceneCanvasDoc, immediate?: boolean, tokenId?: string) => void;
  onBusy?: (busy: boolean) => void;
  onPlace?: (world: { x: number; y: number }) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const dragRef = useRef<DragState | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);
  const [hoverToken, setHoverToken] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const editable = mode === "edit";
  const playable = mode === "play" || mode === "edit";
  const moverRole = role ?? (mode === "edit" ? "dm" : "crawler");
  const panning = editable && (tool === "pan" || spaceDown);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!editable) return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space") {
        if (e.repeat) return;
        const target = e.target;
        if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return;
        }
        e.preventDefault();
        setSpaceDown(true);
      }
    }
    function onUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceDown(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [editable]);

  function live() {
    return docRef.current;
  }

  function commit(next: SceneCanvasDoc, immediate = false, tokenId?: string) {
    docRef.current = next;
    onCommit?.(next, immediate, tokenId);
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button === 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = live();
    const world = screenToWorld(event.clientX, event.clientY, rect, current);
    const middle = event.button === 1;
    const wantPan = editable && (panning || middle || (event.button === 0 && tool === "pan"));

    event.currentTarget.setPointerCapture(event.pointerId);

    if (wantPan) {
      dragRef.current = {
        mode: "pan",
        startX: event.clientX,
        startY: event.clientY,
        panX: current.pan_x,
        panY: current.pan_y,
      };
      onBusy?.(true);
      return;
    }

    if (placing && editable && event.button === 0) {
      onPlace?.(world);
      return;
    }

    const hit = hitTestScene(current, world, rect);
    if (editable && hit?.type === "map" && tool === "select") {
      const layer = current.maps.find((m) => m.id === hit.id);
      if (layer) {
        onSelect?.(hit);
        const raised = bringSceneToFront(current, hit);
        dragRef.current = { mode: "map", id: hit.id, grabX: world.x - layer.x, grabY: world.y - layer.y };
        onBusy?.(true);
        commit(raised);
        return;
      }
    }

    if (hit?.type === "token") {
      const token = current.tokens.find((t) => t.id === hit.id);
      if (token && canMoveSceneToken(token, moverRole, selfId) && playable) {
        onSelect?.(hit);
        const raised = editable ? bringSceneToFront(current, hit) : current;
        dragRef.current = { mode: "token", id: hit.id, grabX: world.x - token.x, grabY: world.y - token.y };
        onBusy?.(true);
        if (raised !== current) commit(raised);
        return;
      }
    }

    if (editable) onSelect?.(hit);
    else onSelect?.(null);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = live();
    if (!drag) {
      const world = screenToWorld(event.clientX, event.clientY, rect, current);
      const hit = hitTestScene(current, world, rect);
      setHoverToken(hit?.type === "token");
      return;
    }
    if (drag.mode !== "token") setHoverToken(false);
    if (drag.mode === "pan") {
      const dx = (event.clientX - drag.startX) / (rect.width * current.zoom);
      const dy = (event.clientY - drag.startY) / (rect.height * current.zoom);
      commit({
        ...current,
        pan_x: clampWorld(drag.panX - dx),
        pan_y: clampWorld(drag.panY - dy),
      });
      return;
    }
    const world = screenToWorld(event.clientX, event.clientY, rect, current);
    if (drag.mode === "map") {
      commit(
        patchSceneMap(current, drag.id, {
          x: clampWorld(world.x - drag.grabX),
          y: clampWorld(world.y - drag.grabY),
        })
      );
      return;
    }
    commit(
      patchSceneToken(current, drag.id, {
        x: clampWorld(world.x - drag.grabX),
        y: clampWorld(world.y - drag.grabY),
      }),
      false,
      drag.id
    );
  }

  function onPointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    const current = live();
    dragRef.current = null;
    onBusy?.(false);
    if (drag.mode === "token") commit(current, true, drag.id);
    else commit(current, true);
  }

  function onPointerLeave() {
    if (!dragRef.current) setHoverToken(false);
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!editable) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const current = live();
    const world = screenToWorld(event.clientX, event.clientY, rect, current);
    const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
    commit(zoomAround(current, world, current.zoom * factor), true);
  }

  const empty = doc.maps.length === 0 && doc.tokens.length === 0;
  const cursor = placing
    ? "crosshair"
    : panning || dragRef.current?.mode === "pan"
      ? "grab"
      : hoverToken
        ? "pointer"
        : "default";

  return (
    <div
      ref={viewportRef}
      className={cn("well relative min-h-0 overflow-hidden", className)}
      style={{ cursor, touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
      onWheel={onWheel}
    >
      {empty ? (
        <div className="flex h-full min-h-[220px] items-center justify-center px-6 text-center text-sm text-[var(--text-3)]">
          {emptyCopy ?? (editable ? EMPTY_SCENE_EDITOR_COPY : EMPTY_SCENE_CANVAS_COPY)}
        </div>
      ) : (
        <>
          {doc.maps
            .slice()
            .sort((a, b) => a.z - b.z)
            .map((layer) => (
              <SceneMapSprite
                key={layer.id}
                layer={layer}
                doc={doc}
                viewport={size}
                selected={selectedId === layer.id && editable}
              />
            ))}
          {doc.tokens
            .slice()
            .sort((a, b) => a.z - b.z)
            .map((token) => (
              <SceneTokenSprite
                key={token.id}
                token={token}
                doc={doc}
                viewport={size}
                selected={selectedId === token.id}
                mine={!!selfId && token.crawler_id === selfId}
                movable={canMoveSceneToken(token, moverRole, selfId) && mode !== "view"}
              />
            ))}
        </>
      )}
    </div>
  );
}

function SceneMapSprite({
  layer,
  doc,
  viewport,
  selected,
}: {
  layer: SceneMapLayer;
  doc: SceneCanvasDoc;
  viewport: { width: number; height: number };
  selected: boolean;
}) {
  if (viewport.width <= 0) return null;
  const pos = worldToScreen(layer, viewport, doc);
  const size = mapSizePx(layer, viewport, doc.zoom);
  return (
    <div
      className={cn(
        "pointer-events-none absolute overflow-hidden rounded-[4px]",
        selected && "ring-2 ring-[var(--cyan-400)] ring-offset-2 ring-offset-[var(--void-950)]"
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={layer.image_url} alt={layer.name} className="h-full w-full object-contain" draggable={false} />
    </div>
  );
}

function SceneTokenSprite({
  token,
  doc,
  viewport,
  selected,
  mine,
  movable,
}: {
  token: SceneToken;
  doc: SceneCanvasDoc;
  viewport: { width: number; height: number };
  selected: boolean;
  mine: boolean;
  movable: boolean;
}) {
  if (viewport.width <= 0) return null;
  const pos = worldToScreen(token, viewport, doc);
  const size = tokenSizePx(token, viewport, doc.zoom);
  const ring = token.kind === "enemy"
    ? "border-[var(--danger)] shadow-[var(--glow-danger)]"
    : mine
      ? "border-[var(--gold-400)] shadow-[var(--glow-gold)]"
      : "border-[var(--cyan-400)] shadow-[var(--glow-cyan)]";

  return (
    <div
      className={cn(
        "pointer-events-none absolute flex flex-col items-center",
        selected && "z-10"
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: size,
        transform: `translate(-50%, -50%) rotate(${token.rotation}deg)`,
      }}
    >
      <div
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-[14px] border-2 bg-[rgba(8,10,18,0.88)]",
          ring,
          selected && "ring-2 ring-[var(--text-1)]",
          movable && "brightness-110"
        )}
      >
        {token.sprite_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={token.sprite_url} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[var(--text-3)]">
            {token.kind === "enemy" ? <Skull size={Math.max(14, size * 0.42)} /> : <User size={Math.max(14, size * 0.42)} />}
          </span>
        )}
      </div>
      <p
        className="mt-0.5 max-w-[7rem] truncate rounded px-1 text-center font-display text-[9px] tracking-[0.08em] text-[var(--text-1)]"
        style={{ background: "rgba(5,6,13,0.72)" }}
      >
        {token.label}
      </p>
    </div>
  );
}
