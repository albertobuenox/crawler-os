"use client";

import { Send } from "lucide-react";
import { BRAND } from "@/lib/copy";

export function SceneChat() {
  return (
    <section
      aria-label="Chat de la escena"
      className="glass flex h-[120px] shrink-0 flex-col overflow-hidden p-3 sm:h-[136px]"
    >
      <p className="text-label mb-2">Canal de party</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p className="font-mono-system text-xs text-[var(--text-3)]">
          Silencio de radio. {BRAND} aún no ha abierto este canal.
        </p>
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => e.preventDefault()}
      >
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
    </section>
  );
}
