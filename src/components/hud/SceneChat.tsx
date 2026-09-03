"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { BRAND } from "@/lib/copy";
import { cn } from "@/lib/utils";

export type ChatSize = "full" | "half" | "quarter";

const STORAGE_KEY = "crawler-os:scene-chat-size";

const SIZES: { id: ChatSize; label: string; bar: string }[] = [
  { id: "full", label: "Todo el ancho", bar: "w-3.5" },
  { id: "half", label: "Media pantalla", bar: "w-2.5" },
  { id: "quarter", label: "Un cuarto", bar: "w-1.5" },
];

const SIZE_BOX: Record<ChatSize, string> = {
  full: "inset-x-2 bottom-2 h-[min(48%,420px)]",
  half: "left-2 right-2 bottom-2 h-[min(42%,360px)] md:left-[5.25rem] md:right-auto md:w-1/2",
  quarter: "left-2 right-2 bottom-2 h-[min(34%,280px)] md:left-[5.25rem] md:right-auto md:w-1/4 md:min-w-[260px]",
};

function readStoredSize(): ChatSize {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "full" || value === "half" || value === "quarter") return value;
  } catch {
    /* ignore */
  }
  return "quarter";
}

export function SceneChat() {
  const [size, setSize] = useState<ChatSize>("quarter");

  useEffect(() => {
    setSize(readStoredSize());
  }, []);

  function chooseSize(next: ChatSize) {
    setSize(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <section
      aria-label="Chat de la escena"
      className={cn(
        "absolute z-[var(--z-drop)] transition-[width,height,left,right] duration-300 ease-[var(--ease-hologram)]",
        SIZE_BOX[size]
      )}
    >
      <div className="glass flex h-full min-h-0 flex-col overflow-hidden p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-label">Canal de party</p>
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
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="font-mono-system text-xs text-[var(--text-3)]">
            Silencio de radio. {BRAND} aún no ha abierto este canal.
          </p>
        </div>
        <form className="mt-2 flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <input
            disabled
            placeholder="El chat se activará más adelante"
            aria-label="Mensaje de chat"
            className="well h-9 flex-1 px-3 text-sm text-[var(--text-1)] placeholder:text-[var(--text-4)] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled
            aria-label="Enviar mensaje"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] border border-[var(--stroke-cyan)] text-[var(--cyan-400)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send size={14} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </section>
  );
}
