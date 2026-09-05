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
import Link from "next/link";
import { Minus, PinOff, Square } from "lucide-react";
import { cn } from "@/lib/utils";

const EDGE = 8;
const MIN_W = 220;
const MIN_H = 140;
const MINIMIZED_W = 240;
const DEFAULT_H = 280;

function storageKey(id: string, kind: "pos" | "min" | "size") {
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

function readSize(id: string, fallback: { width: number; height: number }) {
  try {
    const raw = window.localStorage.getItem(storageKey(id, "size"));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { width?: unknown; height?: unknown };
    const width =
      typeof parsed.width === "number" && Number.isFinite(parsed.width) ? parsed.width : fallback.width;
    const height =
      typeof parsed.height === "number" && Number.isFinite(parsed.height) ? parsed.height : fallback.height;
    return { width, height };
  } catch {
    return fallback;
  }
}

function persistSize(id: string, next: { width: number; height: number }) {
  try {
    window.localStorage.setItem(storageKey(id, "size"), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function clampSize(width: number, height: number, origin?: { x: number; y: number }) {
  const maxW = Math.max(MIN_W, window.innerWidth - EDGE - (origin?.x ?? EDGE));
  const maxH = Math.max(MIN_H, window.innerHeight - EDGE - (origin?.y ?? EDGE));
  return {
    width: Math.round(Math.min(Math.max(width, MIN_W), maxW)),
    height: Math.round(Math.min(Math.max(height, MIN_H), maxH)),
  };
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
  const [size, setSize] = useState({ width, height: DEFAULT_H });
  const [z, setZ] = useState(48);
  const [resizing, setResizing] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);
  posRef.current = pos;
  sizeRef.current = size;

  useEffect(() => {
    if (!resizing) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "nwse-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [resizing]);

  const clampOffset = useCallback((x: number, y: number, box?: { width: number; height: number }) => {
    const el = panelRef.current;
    const used = box ?? sizeRef.current;
    const w = minimized ? MINIMIZED_W : used.width;
    const h = minimized ? (el?.offsetHeight ?? 36) : used.height;
    const maxX = Math.max(EDGE, window.innerWidth - w - EDGE);
    const maxY = Math.max(EDGE, window.innerHeight - h - EDGE);
    return {
      x: Math.round(Math.min(Math.max(x, EDGE), maxX)),
      y: Math.round(Math.min(Math.max(y, EDGE), maxY)),
    };
  }, [minimized]);

  const defaultRef = useRef(defaultPos);
  const defaultSizeRef = useRef({ width, height: DEFAULT_H });

  useEffect(() => {
    setPos(readPos(id, defaultRef.current));
    setSize(readSize(id, defaultSizeRef.current));
    setMinimized(readMinimized(id));
    setMounted(true);
  }, [id]);

  useLayoutEffect(() => {
    if (!mounted) return;
    function recenter() {
      const nextSize = clampSize(sizeRef.current.width, sizeRef.current.height, posRef.current);
      setSize((current) => {
        if (nextSize.width === current.width && nextSize.height === current.height) return current;
        persistSize(id, nextSize);
        return nextSize;
      });
      const nextPos = clampOffset(posRef.current.x, posRef.current.y, nextSize);
      setPos((current) => {
        if (nextPos.x === current.x && nextPos.y === current.y) return current;
        persistPos(id, nextPos);
        return nextPos;
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

  function onResizeDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setZ(62);
    setResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originW: size.width,
      originH: size.height,
    };

    function onMove(moveEvent: PointerEvent) {
      const drag = resizeRef.current;
      if (!drag) return;
      setSize(
        clampSize(
          drag.originW + (moveEvent.clientX - drag.startX),
          drag.originH + (moveEvent.clientY - drag.startY),
          posRef.current
        )
      );
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!resizeRef.current) return;
      resizeRef.current = null;
      setResizing(false);
      persistSize(id, sizeRef.current);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
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
      className="fixed flex flex-col overflow-hidden rounded-[16px] border bg-[rgba(8,10,18,0.94)] shadow-[var(--shadow-glass)] backdrop-blur-xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: minimized ? MINIMIZED_W : size.width,
        height: minimized ? undefined : size.height,
        zIndex: z,
        borderColor: accent,
        boxShadow: `0 0 24px ${accent}33`,
        userSelect: resizing ? "none" : undefined,
      }}
    >
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        className="flex h-9 shrink-0 cursor-grab touch-none items-center gap-2 border-b border-[var(--stroke-glass)] bg-[rgba(16,19,31,0.95)] px-2 select-none active:cursor-grabbing"
        style={{ borderLeft: `3px solid ${accent}` }}
      >
        <span className="shrink-0 text-[var(--text-2)]">{icon}</span>
        <span className="min-w-0 flex-1 truncate font-display text-[10px] tracking-[0.14em] text-[var(--text-1)]">
          {title}
        </span>
        {!minimized && (
          <Link
            href="/dm/notes"
            data-win-action=""
            className="shrink-0 font-display text-[9px] tracking-[0.12em] text-[var(--cyan-400)] underline-offset-2 hover:text-[var(--text-1)] hover:underline"
          >
            ir a notas
          </Link>
        )}
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
      {!minimized && (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pr-4">{children}</div>
          <button
            type="button"
            data-win-action=""
            aria-label="Redimensionar"
            title="Redimensionar"
            onPointerDown={onResizeDown}
            className="absolute right-0 bottom-0 z-[1] flex h-6 w-6 cursor-nwse-resize touch-none items-end justify-end rounded-tl-[8px] p-1 hover:bg-[rgba(255,255,255,0.06)]"
          >
            <span aria-hidden className="relative mb-0.5 mr-0.5 block h-2.5 w-2.5">
              <span
                className="absolute right-0 bottom-0 h-2 w-2 border-r-2 border-b-2 opacity-45"
                style={{ borderColor: accent }}
              />
              <span
                className="absolute right-0 bottom-0 h-1.5 w-1.5 border-r-2 border-b-2 opacity-80"
                style={{ borderColor: accent }}
              />
            </span>
          </button>
        </>
      )}
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
