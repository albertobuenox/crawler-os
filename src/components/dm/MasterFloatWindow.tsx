"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Minus, PinOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const EDGE = 8;

function storageKey(id: string, kind: "pos" | "min") {
  return `crawler-os:master-float:${kind}:${id}`;
}

function readPos(id: string, fallback: { x: number; y: number }) {
  try {
    const raw = window.localStorage.getItem(storageKey(id, "pos"));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    const x = typeof parsed.x === "number" && Number.isFinite(parsed.x) ? parsed.x : fallback.x;
    const y = typeof parsed.y === "number" && Number.isFinite(parsed.y) ? parsed.y : fallback.y;
    return { x, y };
  } catch {
    return fallback;
  }
}

function persistPos(id: string, next: { x: number; y: number }) {
  try {
    window.localStorage.setItem(storageKey(id, "pos"), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function readMinimized(id: string) {
  try {
    return window.localStorage.getItem(storageKey(id, "min")) === "1";
  } catch {
    return false;
  }
}

function persistMinimized(id: string, value: boolean) {
  try {
    window.localStorage.setItem(storageKey(id, "min"), value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function MasterFloatWindow({
  id,
  title,
  accent = "var(--cyan-400)",
  icon,
  width = 320,
  defaultPos,
  onUnpin,
  children,
}: {
  id: string;
  title: string;
  accent?: string;
  icon?: ReactNode;
  width?: number;
  defaultPos: { x: number; y: number };
  onUnpin?: () => void;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState(defaultPos);
  const [z, setZ] = useState(48);
  const panelRef = useRef<HTMLElement | null>(null);
  const posRef = useRef(pos);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  posRef.current = pos;

  const clampOffset = useCallback((x: number, y: number) => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? width;
    const h = el?.offsetHeight ?? 48;
    const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
    const maxY = Math.max(EDGE, window.innerHeight - h - EDGE);
    return {
      x: Math.round(Math.min(Math.max(x, EDGE), maxX)),
      y: Math.round(Math.min(Math.max(y, EDGE), maxY)),
    };
  }, [width]);

  const defaultRef = useRef(defaultPos);

  useEffect(() => {
    setPos(readPos(id, defaultRef.current));
    setMinimized(readMinimized(id));
    setMounted(true);
  }, [id]);

  useLayoutEffect(() => {
    if (!mounted) return;
    function recenter() {
      setPos((current) => {
        const next = clampOffset(current.x, current.y);
        if (next.x !== current.x || next.y !== current.y) persistPos(id, next);
        return next;
      });
    }
    recenter();
    window.addEventListener("resize", recenter);
    return () => window.removeEventListener("resize", recenter);
  }, [clampOffset, id, minimized, mounted]);

  function onHandleDown(e: ReactPointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-win-action]")) return;
    e.preventDefault();
    setZ(62);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    };
  }

  function onHandleMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const next = clampOffset(drag.originX + (e.clientX - drag.startX), drag.originY + (e.clientY - drag.startY));
    setPos(next);
  }

  function onHandleUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    persistPos(id, posRef.current);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function toggleMin() {
    setMinimized((current) => {
      const next = !current;
      persistMinimized(id, next);
      return next;
    });
  }

  if (!mounted) return null;

  return createPortal(
    <article
      ref={panelRef}
      role="dialog"
      aria-label={title}
      onPointerDown={() => setZ(62)}
      className="fixed overflow-hidden rounded-[16px] border bg-[rgba(8,10,18,0.94)] shadow-[var(--shadow-glass)] backdrop-blur-xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: minimized ? 240 : `min(100vw - 16px, ${width}px)`,
        zIndex: z,
        borderColor: accent,
        boxShadow: `0 0 24px ${accent}33`,
      }}
    >
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        className="flex h-9 cursor-grab touch-none items-center gap-2 border-b border-[var(--stroke-glass)] bg-[rgba(16,19,31,0.95)] px-2 select-none active:cursor-grabbing"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <span className="shrink-0 text-[var(--text-2)]">{icon}</span>
        <span className="min-w-0 flex-1 truncate font-display text-[10px] tracking-[0.14em] text-[var(--text-1)]">
          {title}
        </span>
        <button
          type="button"
          data-win-action=""
          aria-label={minimized ? "Maximizar" : "Minimizar"}
          onClick={toggleMin}
          className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--text-3)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-1)]"
        >
          {minimized ? <Square size={11} /> : <Minus size={13} />}
        </button>
        {onUnpin && (
          <button
            type="button"
            data-win-action=""
            aria-label="Dejar de anclar"
            onClick={onUnpin}
            className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[var(--text-3)] hover:bg-[rgba(255,59,92,0.16)] hover:text-[var(--danger)]"
          >
            <PinOff size={12} />
          </button>
        )}
      </div>
      {!minimized && <div className="max-h-[min(42vh,320px)] overflow-y-auto p-3">{children}</div>}
    </article>,
    document.body
  );
}

export function ChecklistProgress({ done, total, className }: { done: number; total: number; className?: string }) {
  const ratio = total === 0 ? 0 : done / total;
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between font-stat text-[11px] text-[var(--cyan-400)]">
        <span>
          {done}/{total}
        </span>
        <span>{Math.round(ratio * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full bg-[var(--cyan-400)] shadow-[var(--glow-cyan)] transition-[width] duration-200"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
