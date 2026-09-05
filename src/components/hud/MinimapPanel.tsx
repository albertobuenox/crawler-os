"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Map, Minus } from "lucide-react";
import { MinimapCanvas } from "@/components/hud/MinimapCanvas";
import { useMinimap } from "@/hooks/useMinimap";
import { MINIMAP_LABEL } from "@/lib/copy";
import { cn } from "@/lib/utils";

const POS_KEY = "crawler-os:minimap-pos";
const MIN_KEY = "crawler-os:minimap-minimized";
const EDGE = 8;

function readPos() {
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    const x = typeof parsed.x === "number" && Number.isFinite(parsed.x) ? parsed.x : 0;
    const y = typeof parsed.y === "number" && Number.isFinite(parsed.y) ? parsed.y : 0;
    return { x, y };
  } catch {
    return { x: 0, y: 0 };
  }
}

function persistPos(next: { x: number; y: number }) {
  try {
    window.localStorage.setItem(POS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function readMinimized() {
  try {
    const value = window.localStorage.getItem(MIN_KEY);
    if (value === "1") return true;
    if (value === "0") return false;
  } catch {
    /* ignore */
  }
  return false;
}

export function MinimapPanel({
  sessionId,
  selfId,
  placement = "absolute",
}: {
  sessionId?: string;
  selfId?: string | null;
  placement?: "absolute" | "fixed";
}) {
  const { doc, ready } = useMinimap(sessionId);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const posRef = useRef(pos);
  const skipClick = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  posRef.current = pos;

  const clampOffset = useCallback(
    (x: number, y: number) => {
      const el = panelRef.current;
      if (!el) return { x, y };
      const parent = el.offsetParent;
      const parentRect =
        placement === "fixed" || !parent
          ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
          : parent.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const current = posRef.current;
      const homeLeft = rect.left - current.x;
      const homeTop = rect.top - current.y;
      const minX = parentRect.left + EDGE - homeLeft;
      const minY = parentRect.top + EDGE - homeTop;
      const maxX = parentRect.left + parentRect.width - EDGE - homeLeft - rect.width;
      const maxY = parentRect.top + parentRect.height - EDGE - homeTop - rect.height;
      return {
        x: Math.round(Math.min(Math.max(x, Math.min(minX, maxX)), Math.max(minX, maxX))),
        y: Math.round(Math.min(Math.max(y, Math.min(minY, maxY)), Math.max(minY, maxY))),
      };
    },
    [placement]
  );

  useEffect(() => {
    setPos(readPos());
    setMinimized(readMinimized());
  }, []);

  useLayoutEffect(() => {
    function recenter() {
      setPos((current) => {
        const next = clampOffset(current.x, current.y);
        if (next.x !== current.x || next.y !== current.y) persistPos(next);
        return next;
      });
    }
    recenter();
    window.addEventListener("resize", recenter);
    return () => window.removeEventListener("resize", recenter);
  }, [clampOffset, minimized]);

  function setDocked(next: boolean) {
    setMinimized(next);
    try {
      window.localStorage.setItem(MIN_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function onDragPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    if (!minimized && (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
    setDragging(true);
  }

  function onDragPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    setPos(clampOffset(drag.originX + dx, drag.originY + dy));
  }

  function onDragPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) skipClick.current = true;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPos((current) => {
      const next = clampOffset(current.x, current.y);
      persistPos(next);
      return next;
    });
  }

  if (!sessionId) return null;

  return (
    <section
      ref={panelRef}
      aria-label={MINIMAP_LABEL}
      aria-expanded={!minimized}
      className={cn(
        placement === "fixed" ? "fixed" : "absolute",
        "z-[var(--z-hud)]",
        minimized ? "right-3 top-3 h-12 w-12 overflow-visible rounded-full" : "right-3 top-3 w-[min(42vw,260px)]",
        dragging ? "transition-none" : "transition-transform duration-[var(--t-modal)] ease-[var(--ease-hologram)]"
      )}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
    >
      <div
        className={cn(
          "relative flex h-full min-h-0",
          minimized ? "items-center justify-center overflow-visible rounded-full p-0" : "flex-col overflow-hidden rounded-[var(--r-lg)] p-3"
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[var(--stroke-glass)] shadow-[var(--shadow-glass)]"
          style={{
            background: "var(--grad-glass)",
            backdropFilter: "blur(var(--blur-glass)) saturate(140%)",
            WebkitBackdropFilter: "blur(var(--blur-glass)) saturate(140%)",
          }}
        />
        <div className={cn("relative z-[1] min-h-0 flex-col", minimized ? "hidden" : "flex")}>
          <div
            className={cn(
              "mb-2 flex items-center justify-between gap-2",
              "cursor-grab touch-none select-none",
              dragging && "cursor-grabbing"
            )}
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
          >
            <p className="text-label">{MINIMAP_LABEL}</p>
            <button
              type="button"
              aria-label="Minimizar minimapa"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--stroke-glass)] text-[var(--text-3)] hover:border-[var(--stroke-cyan)] hover:text-[var(--cyan-400)]"
              onClick={() => setDocked(true)}
            >
              <Minus size={14} />
            </button>
          </div>
          {ready && doc ? (
            <MinimapCanvas doc={doc} viewer="crawler" selfId={selfId} />
          ) : (
            <div className="well aspect-square animate-pulse" />
          )}
          <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-4)]">
            Tú · blanco · aliados · oro · hostiles · rojo
          </p>
        </div>
        {minimized && (
          <button
            type="button"
            aria-label={`Abrir ${MINIMAP_LABEL}`}
            className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-full text-[var(--cyan-400)]"
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onClick={() => {
              if (skipClick.current) {
                skipClick.current = false;
                return;
              }
              setDocked(false);
            }}
          >
            <Map size={18} />
          </button>
        )}
      </div>
    </section>
  );
}
