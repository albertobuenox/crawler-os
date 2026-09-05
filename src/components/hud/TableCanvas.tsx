"use client";

import type { MapPin, Resource, SceneCanvasDoc, TableState } from "@/lib/types";
import { KIND_LABEL, RARITY_LABEL, EMPTY_SCENE_COPY, BRAND } from "@/lib/copy";
import { resourceBlurb } from "@/lib/resources";
import { boxMetaLabel } from "@/lib/loot";
import { SceneStage, type SceneStageMode } from "@/components/hud/SceneStage";
import { isSceneCanvasEmpty, parseSceneCanvas } from "@/lib/scene-canvas";
import { cn } from "@/lib/utils";
import type { SceneHit } from "@/lib/scene-canvas";

interface TableCanvasProps {
  tableState: TableState | null;
  resource?: Resource | null;
  pins?: MapPin[];
  canvas?: SceneCanvasDoc | null;
  showGrid?: boolean;
  className?: string;
  minimal?: boolean;
  mode?: SceneStageMode;
  role?: "dm" | "crawler";
  selfId?: string | null;
  selectedId?: string | null;
  onSelect?: (hit: SceneHit | null) => void;
  onCommit?: (next: SceneCanvasDoc, immediate?: boolean, tokenId?: string) => void;
  onBusy?: (busy: boolean) => void;
}

export function TableCanvas({
  tableState,
  resource,
  pins = [],
  canvas,
  showGrid,
  className,
  minimal,
  mode = "view",
  role,
  selfId,
  selectedId,
  onSelect,
  onCommit,
  onBusy,
}: TableCanvasProps) {
  const shown = tableState?.shown_type ?? "none";
  const grid = showGrid ?? tableState?.show_grid;
  const scene = canvas ?? parseSceneCanvas(tableState?.canvas);
  const hasScene = !isSceneCanvasEmpty(scene);
  const empty = !hasScene && (shown === "none" || !tableState);

  if (empty) {
    return (
      <div
        className={cn(
          "well flex min-h-0 items-center justify-center text-sm text-[var(--text-3)]",
          className
        )}
      >
        {EMPTY_SCENE_COPY}
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-0", className)}>
      {hasScene ? (
        <SceneStage
          doc={scene}
          mode={mode}
          role={role}
          selfId={selfId}
          selectedId={selectedId}
          className="h-full min-h-[220px] w-full"
          onSelect={onSelect}
          onCommit={onCommit}
          onBusy={onBusy}
        />
      ) : (
        <div
          className={cn(
            "well relative h-full min-h-0 overflow-hidden",
            grid && "bg-[length:40px_40px] bg-[linear-gradient(rgba(0,212,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.06)_1px,transparent_1px)]"
          )}
          style={{
            transform: `scale(${tableState?.zoom ?? 1}) translate(${tableState?.pan_x ?? 0}px, ${tableState?.pan_y ?? 0}px)`,
          }}
        >
          {tableState?.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tableState.image_url}
              alt={tableState.title ?? "Pantalla de escena"}
              className="h-full w-full object-contain"
            />
          )}

          {shown === "text" && tableState && (
            <div className="p-6">
              <p className="font-display text-xs tracking-[var(--ls-system)] text-[var(--cyan-400)]">
                {BRAND}
              </p>
              {tableState.title && (
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-1)]">{tableState.title}</h3>
              )}
              {tableState.body_text && (
                <p className="mt-3 text-sm text-[var(--text-2)]">{tableState.body_text}</p>
              )}
            </div>
          )}

          {(shown === "item" || shown === "monster") && resource && !minimal && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="glass p-6">
                <p className="text-label">{KIND_LABEL[resource.kind]}</p>
                <h3 className="mt-2 text-2xl font-bold text-[var(--text-1)]">{resource.name}</h3>
                <p className="mt-2 text-sm text-[var(--text-cyan)]">
                  {resource.kind === "box" ? boxMetaLabel(resource) ?? RARITY_LABEL[resource.rarity] : RARITY_LABEL[resource.rarity]}
                </p>
                {(resource.description?.trim() || resource.system_copy?.trim()) && (
                  <p className="mt-4 max-w-md text-sm italic text-[var(--text-2)]">
                    {resourceBlurb(resource, [], "")}
                  </p>
                )}
              </div>
            </div>
          )}

          {pins.map((pin) => (
            <div
              key={pin.id}
              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[8px] font-bold text-[var(--void-950)] shadow-lg"
              style={{
                left: `${pin.x * 100}%`,
                top: `${pin.y * 100}%`,
                backgroundColor: pin.color,
                boxShadow: `0 0 12px ${pin.color}`,
              }}
              title={pin.label}
            >
              ●
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
