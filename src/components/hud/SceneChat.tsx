"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, Minus, Send } from "lucide-react";
import { chatChannelColor, chatChannelLabel, type ChatChannelOption } from "@/lib/chat";
import { SceneLogList } from "@/components/hud/SceneLogList";
import { useSceneChat } from "@/hooks/useSceneChat";
import { useSceneLog } from "@/hooks/useSceneLog";
import { BRAND, tableLiveLine } from "@/lib/copy";
import { useSessionPresence } from "@/hooks/useSessionPresence";
import { CHAT_BODY_MAX, CHAT_CHANNEL_ALL, type ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ChatSize = "full" | "half" | "quarter";
export type ChatOpacity = "ghost" | "mid" | "solid";
export type ChatPanelTab = "chat" | "log";

const SIZE_STORAGE_KEY = "crawler-os:scene-chat-size";
const OPACITY_STORAGE_KEY = "crawler-os:scene-chat-opacity";
const MIN_STORAGE_KEY = "crawler-os:scene-chat-minimized";
const POS_STORAGE_KEY = "crawler-os:scene-chat-pos";
const TAB_STORAGE_KEY = "crawler-os:scene-chat-tab";

const TABS: { id: ChatPanelTab; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "log", label: "Log" },
];
const DRAG_EDGE_PAD = 8;

const SIZES: { id: ChatSize; label: string; bar: string }[] = [
  { id: "quarter", label: "Un cuarto", bar: "w-1.5" },
  { id: "half", label: "Media pantalla", bar: "w-2.5" },
  { id: "full", label: "Todo el ancho", bar: "w-3.5" },
];

const OPACITIES: { id: ChatOpacity; label: string; fill: string }[] = [
  { id: "ghost", label: "Transparente", fill: "opacity-30" },
  { id: "mid", label: "Media", fill: "opacity-60" },
  { id: "solid", label: "Opaca", fill: "opacity-100" },
];

const OPACITY_BG: Record<ChatOpacity, number> = {
  ghost: 0.32,
  mid: 0.64,
  solid: 1,
};

const SIZE_BOX: Record<ChatSize, string> = {
  full: "left-2 bottom-2 h-[min(48%,420px)] w-[calc(100%-1rem)]",
  half: "left-2 bottom-2 h-[min(42%,360px)] w-[calc(100%-1rem)] md:left-[5.25rem] md:w-1/2",
  quarter:
    "left-2 bottom-2 h-[min(34%,280px)] w-[calc(100%-1rem)] md:left-[5.25rem] md:w-1/4 md:min-w-[260px]",
};

const SIZE_BOX_FIXED: Record<ChatSize, string> = {
  full: "left-16 bottom-4 h-[min(48%,420px)] w-[calc(100%-5rem)]",
  half: "left-16 bottom-4 h-[min(42%,360px)] w-[min(50%,520px)]",
  quarter: "left-16 bottom-4 h-[min(34%,280px)] w-[min(28%,340px)] min-w-[260px]",
};

const DOCK_BOX = "left-2 bottom-2 h-12 w-12 min-w-0 md:left-[5.25rem]";
const DOCK_BOX_FIXED = "left-16 bottom-4 h-12 w-12 min-w-0";

function readStoredSize(): ChatSize {
  try {
    const value = window.localStorage.getItem(SIZE_STORAGE_KEY);
    if (value === "full" || value === "half" || value === "quarter") return value;
  } catch {
    /* ignore */
  }
  return "quarter";
}

function readStoredOpacity(): ChatOpacity {
  try {
    const value = window.localStorage.getItem(OPACITY_STORAGE_KEY);
    if (value === "ghost" || value === "mid" || value === "solid") return value;
  } catch {
    /* ignore */
  }
  return "solid";
}

function readStoredTab(): ChatPanelTab {
  try {
    const value = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (value === "chat" || value === "log") return value;
  } catch {
    /* ignore */
  }
  return "chat";
}

function readStoredMinimized(): boolean {
  try {
    const value = window.localStorage.getItem(MIN_STORAGE_KEY);
    if (value === "0") return false;
    if (value === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

function readStoredPos(): { x: number; y: number } {
  try {
    const raw = window.localStorage.getItem(POS_STORAGE_KEY);
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
    window.localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function ChatLine({
  message,
  members,
  playerIds,
}: {
  message: ChatMessage;
  members: ChatChannelOption[];
  playerIds: string[];
}) {
  const color = chatChannelColor(message.channel, playerIds);
  const channelName = chatChannelLabel(message.channel, members);
  const isMaster = message.author_role === "dm";
  return (
    <li className="rounded px-1.5 py-1">
      <p className="font-mono-system text-[10px] leading-4">
        <span className="text-[var(--text-4)]">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>{" "}
        <span className="font-semibold" style={{ color }}>
          [{message.channel === CHAT_CHANNEL_ALL ? "All" : `→ ${channelName}`}]
        </span>{" "}
        <span className={isMaster ? "font-semibold text-[var(--gold-400)]" : "text-[var(--text-1)]"}>
          {message.author_name}
        </span>
      </p>
      <p className="font-mono-system text-xs leading-5 text-[var(--text-2)]">{message.body}</p>
    </li>
  );
}

export function SceneChat({
  sessionId,
  members,
  placement = "absolute",
  locked = false,
}: {
  sessionId?: string;
  members?: ChatChannelOption[];
  placement?: "absolute" | "fixed";
  locked?: boolean;
}) {
  const pathname = usePathname();
  const viewer = pathname.startsWith("/dm") ? "dm" : "crawler";
  const [size, setSize] = useState<ChatSize>("quarter");
  const [opacity, setOpacity] = useState<ChatOpacity>("solid");
  const [minimized, setMinimized] = useState(true);
  const [panelTab, setPanelTab] = useState<ChatPanelTab>("chat");
  const [unreadChat, setUnreadChat] = useState(0);
  const [unreadLog, setUnreadLog] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const composeInputRef = useRef<HTMLInputElement | null>(null);
  const lastSeenChat = useRef(0);
  const lastSeenLog = useRef(0);
  const historyReady = useRef(false);
  const posRef = useRef(pos);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const skipClickRef = useRef(false);
  const chat = useSceneChat(sessionId, members);
  const live = useSessionPresence(sessionId);
  const rosterNames = Object.fromEntries(chat.roster.map((m) => [m.id, m.label]));
  const log = useSceneLog(sessionId, rosterNames);
  posRef.current = pos;

  const canDrag = !locked && (minimized || size === "quarter" || size === "half");

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
      const minX = parentRect.left + DRAG_EDGE_PAD - homeLeft;
      const minY = parentRect.top + DRAG_EDGE_PAD - homeTop;
      const maxX = parentRect.left + parentRect.width - DRAG_EDGE_PAD - homeLeft - rect.width;
      const maxY = parentRect.top + parentRect.height - DRAG_EDGE_PAD - homeTop - rect.height;

      return {
        x: Math.round(Math.min(Math.max(x, Math.min(minX, maxX)), Math.max(minX, maxX))),
        y: Math.round(Math.min(Math.max(y, Math.min(minY, maxY)), Math.max(minY, maxY))),
      };
    },
    [placement]
  );

  useEffect(() => {
    setSize(readStoredSize());
    setOpacity(readStoredOpacity());
    setMinimized(readStoredMinimized());
    setPanelTab(readStoredTab());
    setPos(readStoredPos());
  }, []);

  useLayoutEffect(() => {
    if (!canDrag) return;
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
  }, [canDrag, size, minimized, clampOffset]);

  useEffect(() => {
    if (!historyReady.current && chat.ready && log.ready) {
      lastSeenChat.current = chat.messages.length;
      lastSeenLog.current = log.count;
      historyReady.current = true;
      return;
    }
    const extraChat = Math.max(0, chat.messages.length - lastSeenChat.current);
    const extraLog = Math.max(0, log.count - lastSeenLog.current);
    if (minimized) {
      setUnreadChat(extraChat);
      setUnreadLog(extraLog);
      return;
    }
    if (panelTab === "chat") {
      lastSeenChat.current = chat.messages.length;
      setUnreadChat(0);
      setUnreadLog(extraLog);
    } else {
      lastSeenLog.current = log.count;
      setUnreadLog(0);
      setUnreadChat(extraChat);
    }
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [chat.messages, chat.ready, log.count, log.ready, minimized, panelTab]);

  function chooseSize(next: ChatSize) {
    setSize(next);
    try {
      window.localStorage.setItem(SIZE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function chooseTab(next: ChatPanelTab) {
    setPanelTab(next);
    try {
      window.localStorage.setItem(TAB_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function chooseOpacity(next: ChatOpacity) {
    setOpacity(next);
    try {
      window.localStorage.setItem(OPACITY_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function setDocked(next: boolean) {
    setMinimized(next);
    try {
      window.localStorage.setItem(MIN_STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  function onDragPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!canDrag || event.button !== 0) return;
    if (!minimized && (event.target as HTMLElement).closest("button, select, input, textarea, a")) {
      return;
    }
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
    if (drag.moved) skipClickRef.current = true;
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

  function onDockClick() {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    setDocked(false);
  }

  useEffect(() => {
    if (locked || minimized || panelTab !== "chat") return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const dialog = target.closest("[role='dialog']");
        if (dialog && !panelRef.current?.contains(dialog)) return;
        if (!panelRef.current?.contains(target)) {
          const tag = target.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
            return;
          }
        }
      }
      event.preventDefault();
      chat.cycleChannel(event.shiftKey ? -1 : 1);
      composeInputRef.current?.focus();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [chat.cycleChannel, locked, minimized, panelTab]);

  const playerIds = chat.roster.map((m) => m.id);
  const channelColor = chatChannelColor(chat.channel, playerIds);
  const canSend = Boolean(!locked && sessionId && chat.ready && chat.draft.trim() && !chat.sending);
  const unread = unreadChat + unreadLog;
  const composeTabIndex = minimized || panelTab !== "chat" ? -1 : 0;

  return (
    <section
      ref={panelRef}
      aria-label="Chat de la escena"
      aria-expanded={!minimized}
      className={cn(
        placement === "fixed" ? "fixed" : "absolute",
        "z-[var(--z-hud)]",
        locked && "pointer-events-none",
        minimized ? "overflow-visible" : "overflow-hidden",
        dragging
          ? "transition-none"
          : "transition-[left,width,height,min-width,transform] duration-[var(--t-modal)] ease-[var(--ease-hologram)]",
        minimized
          ? placement === "fixed"
            ? DOCK_BOX_FIXED
            : DOCK_BOX
          : placement === "fixed"
            ? SIZE_BOX_FIXED[size]
            : SIZE_BOX[size],
        minimized && "rounded-full"
      )}
      style={canDrag ? { transform: `translate(${pos.x}px, ${pos.y}px)` } : undefined}
    >
      <div
        className={cn(
          "relative flex h-full min-h-0",
          minimized
            ? "items-center justify-center overflow-visible rounded-full p-0"
            : "flex-col overflow-hidden rounded-[var(--r-lg)] p-3"
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[var(--stroke-glass)] shadow-[var(--shadow-glass)] transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]"
          style={{
            opacity: OPACITY_BG[opacity],
            background: "var(--grad-glass)",
            backdropFilter: "blur(var(--blur-glass)) saturate(140%)",
            WebkitBackdropFilter: "blur(var(--blur-glass)) saturate(140%)",
          }}
        />
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            "transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
            minimized
              ? "pointer-events-none absolute inset-0 z-0 p-3 opacity-0"
              : "relative z-[1]"
          )}
          aria-hidden={minimized}
        >
          <div
            className={cn(
              "relative mb-2 flex flex-wrap items-center justify-between gap-1.5",
              canDrag && "cursor-grab touch-none select-none",
              dragging && "cursor-grabbing"
            )}
            onPointerDown={onDragPointerDown}
            onPointerMove={onDragPointerMove}
            onPointerUp={onDragPointerUp}
            onPointerCancel={onDragPointerUp}
          >
            <div
              role="tablist"
              aria-label="Chat y log"
              className="flex items-center gap-0.5 rounded-full border border-[var(--stroke-glass)] p-0.5"
            >
              {TABS.map(({ id, label }) => {
                const active = panelTab === id;
                const unread = id === "chat" ? unreadChat : unreadLog;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls={id === "chat" ? "scene-chat-thread" : "scene-log-thread"}
                    title={label}
                    tabIndex={minimized ? -1 : 0}
                    onClick={() => chooseTab(id)}
                    className={cn(
                      "relative h-7 min-w-[2.75rem] rounded-full px-2.5 font-display text-[10px] uppercase tracking-[0.14em]",
                      "transition-colors duration-[var(--t-ui)]",
                      active
                        ? "bg-[rgba(0,212,255,0.14)] text-[var(--cyan-400)]"
                        : "text-[var(--text-4)] hover:text-[var(--text-1)]"
                    )}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      {label}
                      {!active && unread > 0 && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-[var(--cyan-400)] shadow-[0_0_6px_var(--cyan-400)]"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="min-w-0 truncate font-display text-[9px] uppercase tracking-[0.12em] text-[var(--text-cyan)]">
              {tableLiveLine(live.crawlerOnline, chat.roster.length, live.masterOnline)}
            </p>
            <div className="flex shrink-0 touch-auto items-center gap-1">
              <div
                role="group"
                aria-label="Opacidad del chat"
                className="flex items-center gap-0.5 rounded-full border border-[var(--stroke-glass)] p-0.5"
              >
                {OPACITIES.map(({ id, label, fill }) => {
                  const active = opacity === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={label}
                      aria-pressed={active}
                      title={label}
                      tabIndex={minimized ? -1 : 0}
                      onClick={() => chooseOpacity(id)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-[var(--t-ui)]",
                        active
                          ? "bg-[rgba(0,212,255,0.14)] text-[var(--cyan-400)]"
                          : "text-[var(--text-4)] hover:text-[var(--text-1)]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2.5 w-2.5 rounded-full",
                          fill,
                          active ? "bg-[var(--cyan-400)]" : "bg-current"
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <div
                role="group"
                aria-label="Tamaño del chat"
                className="flex items-center gap-0.5 rounded-full border border-[var(--stroke-glass)] p-0.5"
              >
                {SIZES.map(({ id, label, bar }) => {
                  const active = size === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={label}
                      aria-pressed={active}
                      title={label}
                      tabIndex={minimized ? -1 : 0}
                      onClick={() => chooseSize(id)}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-[var(--t-ui)]",
                        active
                          ? "bg-[rgba(0,212,255,0.14)] text-[var(--cyan-400)]"
                          : "text-[var(--text-4)] hover:text-[var(--text-1)]"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 rounded-[2px] border",
                          bar,
                          active
                            ? "border-[var(--cyan-400)] bg-[var(--cyan-400)]"
                            : "border-current"
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                aria-label="Minimizar chat"
                title="Minimizar"
                tabIndex={minimized ? -1 : 0}
                onClick={() => setDocked(true)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border border-[var(--stroke-glass)]",
                  "text-[var(--text-4)] transition-colors duration-[var(--t-ui)]",
                  "hover:border-[var(--stroke-cyan)] hover:text-[var(--cyan-400)]"
                )}
              >
                <Minus size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ul
              ref={listRef}
              id={panelTab === "chat" ? "scene-chat-thread" : "scene-log-thread"}
              role="tabpanel"
              className="h-full space-y-0.5 overflow-y-auto pr-1"
            >
              {panelTab === "log" ? (
                <SceneLogList
                  items={log.items}
                  viewer={viewer}
                  ready={log.ready}
                  sessionId={sessionId}
                />
              ) : chat.messages.length === 0 ? (
                <li className="font-mono-system text-xs text-[var(--text-3)]">
                  {sessionId
                    ? `Silencio de radio. ${BRAND} escucha el canal.`
                    : `Conectando al canal de ${BRAND}…`}
                </li>
              ) : (
                chat.messages.map((message) => (
                  <ChatLine
                    key={message.id}
                    message={message}
                    members={chat.roster}
                    playerIds={playerIds}
                  />
                ))
              )}
            </ul>
          </div>
          <form
            className={cn("mt-2 flex gap-2", panelTab !== "chat" && "hidden")}
            onSubmit={(e) => {
              e.preventDefault();
              void chat.send();
            }}
          >
            <label className="sr-only" htmlFor="scene-chat-channel">
              Canal
            </label>
            <select
              id="scene-chat-channel"
              value={chat.channel}
              disabled={locked || !sessionId || !chat.ready}
              tabIndex={composeTabIndex}
              onChange={(e) => chat.setChannel(e.target.value)}
              className="well h-9 w-[5.75rem] shrink-0 px-1.5 text-[11px] font-semibold disabled:opacity-60"
              style={{ color: channelColor }}
              title="Tab cambia de canal"
              aria-label="Canal de chat. Tab para el siguiente, Mayús+Tab para el anterior."
            >
              <option value={CHAT_CHANNEL_ALL}>All</option>
              {chat.roster.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
            <input
              ref={composeInputRef}
              value={chat.draft}
              disabled={locked || !sessionId || !chat.ready || chat.sending}
              tabIndex={composeTabIndex}
              maxLength={CHAT_BODY_MAX}
              onChange={(e) => chat.setDraft(e.target.value)}
              placeholder={
                chat.channel === CHAT_CHANNEL_ALL
                  ? "Mensaje a todos"
                  : `Mensaje a ${chatChannelLabel(chat.channel, chat.roster)}`
              }
              aria-label="Mensaje de chat"
              className="well h-9 flex-1 px-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-4)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!canSend}
              tabIndex={composeTabIndex}
              aria-label="Enviar mensaje"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--stroke-cyan)] text-[var(--cyan-400)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Send size={14} strokeWidth={1.75} />
            </button>
          </form>
        </div>

        <button
          type="button"
          tabIndex={minimized ? 0 : -1}
          aria-hidden={!minimized}
          aria-label={
            unread > 0
              ? `Abrir chat de la escena, ${unread} novedades`
              : "Abrir chat de la escena"
          }
          title="Arrastra para mover · clic para abrir"
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          onPointerCancel={onDragPointerUp}
          onClick={onDockClick}
          className={cn(
            "flex items-center justify-center text-[var(--cyan-400)]",
            "transition-[opacity,background-color,box-shadow] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
            minimized
              ? cn(
                  "relative z-[2] h-full w-full shrink-0 cursor-grab touch-none opacity-100 delay-150",
                  "hover:bg-[rgba(0,212,255,0.14)] hover:shadow-[var(--glow-cyan)]",
                  dragging && "cursor-grabbing"
                )
              : "pointer-events-none absolute inset-0 z-0 opacity-0 delay-0"
          )}
        >
          <MessageCircle size={18} strokeWidth={1.75} />
          {minimized && unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[var(--danger)] shadow-[0_0_8px_var(--danger)]"
            />
          )}
        </button>
      </div>
    </section>
  );
}
