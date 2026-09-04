"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Minus, Send } from "lucide-react";
import { BRAND } from "@/lib/copy";
import { cn } from "@/lib/utils";

export type ChatSize = "full" | "half" | "quarter";

const SIZE_STORAGE_KEY = "crawler-os:scene-chat-size";
const MIN_STORAGE_KEY = "crawler-os:scene-chat-minimized";

const SIZES: { id: ChatSize; label: string; bar: string }[] = [
  { id: "full", label: "Todo el ancho", bar: "w-3.5" },
  { id: "half", label: "Media pantalla", bar: "w-2.5" },
  { id: "quarter", label: "Un cuarto", bar: "w-1.5" },
];

const SIZE_BOX: Record<ChatSize, string> = {
  full: "left-2 bottom-2 h-[min(48%,420px)] w-[calc(100%-1rem)]",
  half: "left-2 bottom-2 h-[min(42%,360px)] w-[calc(100%-1rem)] md:left-[5.25rem] md:w-1/2",
  quarter:
    "left-2 bottom-2 h-[min(34%,280px)] w-[calc(100%-1rem)] md:left-[5.25rem] md:w-1/4 md:min-w-[260px]",
};

const DOCK_BOX = "left-2 bottom-2 h-12 w-12 min-w-0 md:left-[5.25rem]";

function readStoredSize(): ChatSize {
  try {
    const value = window.localStorage.getItem(SIZE_STORAGE_KEY);
    if (value === "full" || value === "half" || value === "quarter") return value;
  } catch {
    /* ignore */
  }
  return "quarter";
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

export function SceneChat() {
  const [size, setSize] = useState<ChatSize>("quarter");
  const [minimized, setMinimized] = useState(true);

  useEffect(() => {
    setSize(readStoredSize());
    setMinimized(readStoredMinimized());
  }, []);

  function chooseSize(next: ChatSize) {
    setSize(next);
    try {
      window.localStorage.setItem(SIZE_STORAGE_KEY, next);
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

  return (
    <section
      aria-label="Chat de la escena"
      aria-expanded={!minimized}
      className={cn(
        "absolute z-[var(--z-drop)] overflow-hidden",
        "transition-[left,width,height,min-width] duration-[var(--t-modal)] ease-[var(--ease-hologram)]",
        minimized ? DOCK_BOX : SIZE_BOX[size],
        minimized && "rounded-full"
      )}
    >
      <div
        className={cn(
          "glass relative flex h-full min-h-0 overflow-hidden",
          minimized ? "items-center justify-center p-0" : "flex-col p-3"
        )}
        style={minimized ? { borderRadius: 9999 } : undefined}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            "transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
            minimized && "pointer-events-none absolute inset-0 p-3 opacity-0"
          )}
          aria-hidden={minimized}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-label">Canal de party</p>
            <div className="flex items-center gap-1">
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            <p className="font-mono-system text-xs text-[var(--text-3)]">
              Silencio de radio. {BRAND} aún no ha abierto este canal.
            </p>
          </div>
          <form className="mt-2 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input
              disabled
              tabIndex={-1}
              placeholder="El chat se activará más adelante"
              aria-label="Mensaje de chat"
              className="well h-9 flex-1 px-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-4)] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled
              tabIndex={-1}
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
          aria-label="Abrir chat de la escena"
          title="Abrir canal de party"
          onClick={() => setDocked(false)}
          className={cn(
            "flex items-center justify-center text-[var(--cyan-400)]",
            "transition-[opacity,background-color,box-shadow] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
            minimized
              ? "relative h-full w-full opacity-100 delay-150 hover:bg-[rgba(0,212,255,0.14)] hover:shadow-[var(--glow-cyan)]"
              : "pointer-events-none absolute inset-0 opacity-0 delay-0"
          )}
        >
          <MessageCircle size={18} strokeWidth={1.75} />
        </button>
      </div>
    </section>
  );
}
