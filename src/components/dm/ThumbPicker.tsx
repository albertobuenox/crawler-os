"use client";

import { useId, useState } from "react";
import type { ItemArtPreset } from "@/lib/item-art";
import { cn } from "@/lib/utils";

export function ThumbPicker({
  value,
  options,
  sessionId,
  disabled = false,
  hint = "O elige una de su tipo.",
  onChange,
  onBusy,
}: {
  value: string | null;
  options: ItemArtPreset[];
  sessionId: string | null;
  disabled?: boolean;
  hint?: string;
  onChange: (url: string | null) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const fileId = useId();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadSprite(file: File) {
    if (!sessionId || disabled) return;
    setError("");
    setUploading(true);
    onBusy?.(true);
    const body = new FormData();
    body.set("file", file);
    body.set("kind", "resource");
    body.set("session_id", sessionId);
    const res = await fetch("/api/dm/scene-assets", { method: "POST", body });
    const json = (await res.json()) as { url?: string; error?: string };
    setUploading(false);
    onBusy?.(false);
    if (!res.ok || !json.url) {
      setError(json.error || "El Sistema rechazó el sprite.");
      return;
    }
    onChange(json.url);
  }

  return (
    <div className="space-y-2">
      <p className="text-label">Miniatura</p>
      <div className="flex items-center gap-3">
        <span className="h-16 w-16 overflow-hidden rounded-[12px] border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.8)]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : null}
        </span>
        {sessionId ? (
          <label
            htmlFor={fileId}
            className={cn(
              "btn-neon inline-flex h-10 cursor-pointer items-center px-4 text-sm",
              (disabled || uploading) && "pointer-events-none opacity-45",
            )}
          >
            {value ? "Subir otra" : "Subir imagen"}
          </label>
        ) : null}
        <input
          id={fileId}
          type="file"
          accept="image/webp,image/png,image/jpeg,image/gif"
          className="sr-only"
          disabled={disabled || uploading || !sessionId}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadSprite(file);
          }}
        />
      </div>
      {options.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-3)]">{hint}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {options.map((preset) => {
              const selected = value === preset.src;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => onChange(preset.src)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border px-1.5 py-1.5 text-center transition-colors",
                    selected
                      ? "border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] shadow-[var(--glow-cyan)]"
                      : "border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.45)] hover:border-[var(--stroke-cyan)]",
                  )}
                >
                  <span className="h-14 w-full overflow-hidden rounded-lg bg-[rgba(5,6,13,0.85)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset.src} alt="" className="h-full w-full object-cover" />
                  </span>
                  <span className="line-clamp-2 min-h-[2rem] text-[10px] leading-tight text-[var(--text-2)]">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
