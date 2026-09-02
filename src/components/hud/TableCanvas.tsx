"use client";

import type { TableState, MapPin, Resource } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TableCanvasProps {
  tableState: TableState | null;
  resource?: Resource | null;
  pins?: MapPin[];
  showGrid?: boolean;
  className?: string;
  minimal?: boolean;
}

export function TableCanvas({
  tableState,
  resource,
  pins = [],
  showGrid,
  className,
  minimal,
}: TableCanvasProps) {
  const shown = tableState?.shown_type ?? "none";
  const grid = showGrid ?? tableState?.show_grid;

  if (shown === "none" || !tableState) {
    return (
      <div
        className={cn(
          "well flex min-h-[280px] items-center justify-center text-sm text-[var(--text-3)]",
          className
        )}
      >
        The System is waiting for La IA to show something.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "well relative min-h-[280px] overflow-hidden",
        grid && "bg-[length:40px_40px] bg-[linear-gradient(rgba(0,212,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.06)_1px,transparent_1px)]",
        className
      )}
      style={{
        transform: `scale(${tableState.zoom}) translate(${tableState.pan_x}px, ${tableState.pan_y}px)`,
      }}
    >
      {tableState.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tableState.image_url}
          alt={tableState.title ?? "Table display"}
          className="h-full w-full object-contain"
        />
      )}

      {shown === "text" && (
        <div className="p-6">
          <p className="font-display text-xs tracking-[var(--ls-system)] text-[var(--cyan-400)]">
            SYSTEM MESSAGE
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
            <p className="text-label">{resource.kind}</p>
            <h3 className="mt-2 text-2xl font-bold text-[var(--text-1)]">{resource.name}</h3>
            <p className="mt-2 text-sm capitalize text-[var(--text-cyan)]">{resource.rarity}</p>
            {resource.system_copy && (
              <p className="mt-4 max-w-md text-sm italic text-[var(--text-2)]">
                {resource.system_copy}
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
  );
}
