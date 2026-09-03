"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertOctagon,
  Dices,
  Gift,
  Medal,
  Swords,
  Terminal,
  X,
  type LucideIcon,
} from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { BRAND } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/lib/types";

const WINDOW_W = 380;
const BASE_Z = 50;
const EASE_IN = [0.22, 1, 0.36, 1] as const;
const EASE_OUT = [0.4, 0, 1, 1] as const;
const CLOSE_MS = 0.2;

const TYPE_META: Record<
  NotificationType,
  { label: string; color: string; Icon: LucideIcon }
> = {
  reward: { label: "REWARD", color: "var(--orange-400)", Icon: Gift },
  penalty: { label: "PENALTY", color: "var(--danger)", Icon: AlertOctagon },
  system: { label: "SYSTEM MESSAGE", color: "var(--cyan-400)", Icon: Terminal },
  combat: { label: "COMBAT", color: "var(--hp)", Icon: Swords },
  roll: { label: "ROLL", color: "var(--text-cyan)", Icon: Dices },
  achievement: { label: "ACHIEVEMENT", color: "var(--gold-400)", Icon: Medal },
  loot_box: { label: "LOOT BOX", color: "var(--orange-400)", Icon: Gift },
};

type OpenWindow = {
  id: string;
  notification: Notification;
  seed: number;
  closing: boolean;
  flyX: number;
  flyY: number;
};

function relativeTime(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "ahora";
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
  return `hace ${Math.floor(seconds / 86400)}d`;
}

function lineText(n: Notification) {
  return n.body?.trim() ? `${n.title} — ${n.body}` : n.title;
}

function clampPos(x: number, y: number) {
  const maxX = typeof window === "undefined" ? x : window.innerWidth - 72;
  const maxY = typeof window === "undefined" ? y : window.innerHeight - 40;
  return {
    x: Math.min(Math.max(x, 8 - WINDOW_W + 72), maxX),
    y: Math.min(Math.max(y, 8), maxY),
  };
}

function dockTarget(mailRef: { current: HTMLElement | null }) {
  return mailRef.current ?? document.querySelector<HTMLElement>("[data-mail-dock]");
}

export function NotificationInbox({
  open,
  onOpenChange,
  mailRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mailRef: { current: HTMLElement | null };
}) {
  const { notifications, loaded, markRead } = useNotifications("notification-inbox");
  const [windows, setWindows] = useState<OpenWindow[]>([]);
  const [mounted, setMounted] = useState(false);
  const seedRef = useRef(0);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const bringToFront = useCallback((id: string) => {
    setWindows((prev) => {
      const i = prev.findIndex((w) => w.id === id);
      if (i < 0 || i === prev.length - 1) return prev;
      const next = [...prev];
      const [win] = next.splice(i, 1);
      next.push(win);
      return next;
    });
  }, []);

  const openWindow = useCallback(
    (n: Notification) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.id === n.id);
        if (existing) {
          const rest = prev.filter((w) => w.id !== n.id);
          return [...rest, { ...existing, closing: false, flyX: 0, flyY: 0 }];
        }
        seedRef.current += 1;
        return [
          ...prev,
          {
            id: n.id,
            notification: n,
            seed: seedRef.current,
            closing: false,
            flyX: 0,
            flyY: 0,
          },
        ];
      });
      if (!n.is_read) void markRead(n.id);
    },
    [markRead]
  );

  const requestClose = useCallback(
    (id: string, el: HTMLElement | null) => {
      const mail = dockTarget(mailRef);
      if (!el || !mail || reduceMotion) {
        setWindows((prev) => prev.filter((w) => w.id !== id));
        return;
      }
      const wr = el.getBoundingClientRect();
      const mr = mail.getBoundingClientRect();
      const travel = 0.55;
      const flyX = (mr.left + mr.width / 2 - (wr.left + wr.width / 2)) * travel;
      const flyY = (mr.top + mr.height / 2 - (wr.top + wr.height / 2)) * travel;
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, closing: true, flyX, flyY } : w))
      );
    },
    [mailRef, reduceMotion]
  );

  const removeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  useEffect(() => {
    if (!open && windows.every((w) => !w.closing)) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const top = [...windows].reverse().find((w) => !w.closing);
      if (top) {
        e.preventDefault();
        requestClose(top.id, document.getElementById(`notif-win-${top.id}`));
        return;
      }
      if (open) {
        e.preventDefault();
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, windows, onOpenChange, requestClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <motion.button
            key="notif-backdrop"
            type="button"
            aria-label="Cerrar notificaciones"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.18 }}
            className="fixed inset-0 z-[var(--z-overlay)] cursor-default bg-[rgba(5,6,13,0.18)]"
            onClick={() => onOpenChange(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            key="notif-sidebar"
            role="dialog"
            aria-modal="false"
            aria-labelledby={titleId}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 28 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: EASE_IN }}
            className="fixed top-0 right-0 bottom-[72px] z-[var(--z-overlay)] flex w-[min(100vw,20.5rem)] flex-col border-l border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.92)] pt-16 shadow-[var(--shadow-glass)] backdrop-blur-xl lg:bottom-0"
          >
            <header className="shrink-0 border-b border-[var(--stroke-glass)] px-4 pb-3">
              <p id={titleId} className="font-display text-sm tracking-[var(--ls-label)] text-[var(--text-1)]">
                Notificaciones
              </p>
              <p className="mt-0.5 text-[10px] tracking-[var(--ls-system)] text-[var(--text-cyan)]">
                {BRAND}
              </p>
            </header>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {!loaded && (
                <li className="px-2 py-6 text-center text-xs text-[var(--text-4)]">Consultando al Sistema…</li>
              )}
              {loaded && notifications.length === 0 && (
                <li className="px-2 py-6 text-center text-xs text-[var(--text-3)]">
                  Nada de {BRAND} todavía. El dungeon observa.
                </li>
              )}
              {notifications.map((n) => {
                const meta = TYPE_META[n.notification_type] ?? TYPE_META.system;
                const Icon = meta.Icon;
                const isOpen = windows.some((w) => w.id === n.id && !w.closing);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openWindow(n)}
                      className={cn(
                        "flex w-full min-w-0 items-center gap-2 rounded-[var(--r-sm)] px-2 py-2 text-left transition-colors duration-[var(--t-ui)]",
                        !n.is_read && "bg-[rgba(0,212,255,0.05)]",
                        isOpen
                          ? "border border-[var(--stroke-cyan-hot)]"
                          : "border border-transparent hover:bg-[rgba(0,212,255,0.08)]"
                      )}
                    >
                      <Icon
                        size={14}
                        strokeWidth={1.75}
                        className="shrink-0"
                        style={{ color: meta.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-1)]">
                        {lineText(n)}
                      </span>
                      <span className="shrink-0 font-mono-system text-[10px] text-[var(--text-4)]">
                        {relativeTime(n.created_at)}
                      </span>
                      {!n.is_read && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--cyan-400)] shadow-[var(--glow-cyan)]"
                          aria-label="Sin leer"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.aside>
        )}
      </AnimatePresence>

      {windows.map((w, i) => (
        <ExplorerWindow
          key={w.id}
          data={w}
          zIndex={BASE_Z + i}
          reduceMotion={!!reduceMotion}
          onFocus={() => bringToFront(w.id)}
          onClose={(el) => requestClose(w.id, el)}
          onClosed={() => removeWindow(w.id)}
        />
      ))}
    </>,
    document.body
  );
}

function ExplorerWindow({
  data,
  zIndex,
  reduceMotion,
  onFocus,
  onClose,
  onClosed,
}: {
  data: OpenWindow;
  zIndex: number;
  reduceMotion: boolean;
  onFocus: () => void;
  onClose: (el: HTMLElement | null) => void;
  onClosed: () => void;
}) {
  const n = data.notification;
  const meta = TYPE_META[n.notification_type] ?? TYPE_META.system;
  const nodeRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
  const [pos, setPos] = useState(() => {
    const cascade = (data.seed % 6) * 28;
    const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
    return clampPos(Math.max(24, vw / 2 - WINDOW_W / 2 - 40 + cascade), 88 + cascade);
  });

  function onHandleDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (data.closing) return;
    if ((e.target as HTMLElement).closest("[data-win-close]")) return;
    e.preventDefault();
    onFocus();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { ox: e.clientX, oy: e.clientY, sx: pos.x, sy: pos.y };
  }

  function onHandleMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setPos(clampPos(drag.sx + (e.clientX - drag.ox), drag.sy + (e.clientY - drag.oy)));
  }

  function onHandleUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  const payloadName =
    typeof n.payload?.resource_name === "string" ? n.payload.resource_name : null;

  return (
    <motion.div
      id={`notif-win-${n.id}`}
      ref={nodeRef}
      role="dialog"
      aria-label={n.title}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 }}
      animate={
        data.closing
          ? reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, x: data.flyX, y: data.flyY, scale: 0.12 }
          : { opacity: 1, x: 0, y: 0, scale: 1 }
      }
      transition={
        data.closing
          ? {
              duration: reduceMotion ? 0.12 : CLOSE_MS,
              ease: EASE_OUT,
              opacity: { duration: reduceMotion ? 0.12 : 0.14, delay: reduceMotion ? 0 : 0.04 },
            }
          : { duration: 0.22, ease: EASE_IN }
      }
      onAnimationComplete={() => {
        if (data.closing) onClosed();
      }}
      onPointerDown={onFocus}
      className="fixed overflow-hidden rounded-[var(--r-md)] border border-[var(--stroke-cyan)] bg-[rgba(10,12,24,0.96)] shadow-[var(--shadow-glass)] backdrop-blur-xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: `min(100vw - 16px, ${WINDOW_W}px)`,
        zIndex,
        transformOrigin: "center center",
        pointerEvents: data.closing ? "none" : "auto",
      }}
    >
      <div
        onPointerDown={onHandleDown}
        onPointerMove={onHandleMove}
        onPointerUp={onHandleUp}
        onPointerCancel={onHandleUp}
        className="flex h-9 cursor-grab touch-none items-center gap-2 border-b border-[var(--stroke-glass)] bg-[rgba(16,19,31,0.95)] px-2 select-none active:cursor-grabbing"
        style={{ borderLeft: `2px solid ${meta.color}` }}
      >
        <meta.Icon size={13} strokeWidth={1.75} style={{ color: meta.color }} aria-hidden="true" />
        <span
          className="min-w-0 flex-1 truncate font-display text-[10px] tracking-[var(--ls-system)]"
          style={{ color: meta.color }}
        >
          {meta.label}
        </span>
        <button
          type="button"
          data-win-close=""
          aria-label="Cerrar"
          onClick={(e) => {
            e.stopPropagation();
            onClose(nodeRef.current);
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] text-[var(--text-3)] transition-colors duration-[var(--t-micro)] hover:bg-[rgba(255,59,92,0.16)] hover:text-[var(--danger)]"
        >
          <X size={13} strokeWidth={1.75} />
        </button>
      </div>
      <div className="max-h-[min(40vh,280px)] overflow-y-auto px-4 py-3">
        <h3 className="font-display text-sm tracking-wide text-[var(--text-1)]">{n.title}</h3>
        {n.body && <p className="mt-2 text-sm leading-relaxed text-[var(--text-2)]">{n.body}</p>}
        {payloadName && (
          <p className="mt-3 text-xs tracking-[var(--ls-label)] text-[var(--orange-400)]">{payloadName}</p>
        )}
        <p className="mt-3 font-mono-system text-[10px] text-[var(--text-4)]">
          {new Date(n.created_at).toLocaleString([], {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </motion.div>
  );
}
