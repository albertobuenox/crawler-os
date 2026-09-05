"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ResourceKindMark } from "@/components/hud/ResourceKindMark";
import { createClient } from "@/lib/supabase/client";
import { crawlerAvatarUrl, crawlerInitials } from "@/lib/crawler-art";
import { BRAND, GIVE_TO_CRAWLER } from "@/lib/copy";
import {
  GRANT_DELIVERY_OPTIONS,
  grantCinematicPayload,
  grantResourceToCrawlers,
  grantableResources,
  isGrantableResource,
  type GrantDelivery,
} from "@/lib/grant";
import { objectTypeLabel } from "@/lib/objects";
import { useSessionBroadcast } from "@/hooks/useSession";
import type { Crawler, Resource } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GiveToCrawlerModal({
  open,
  sessionId,
  resource = null,
  crawler = null,
  crawlers: crawlersProp,
  resources: resourcesProp,
  onClose,
}: {
  open: boolean;
  sessionId: string | null;
  resource?: Resource | null;
  crawler?: Crawler | null;
  crawlers?: Crawler[];
  resources?: Resource[];
  onClose: () => void;
}) {
  const supabase = createClient();
  const { broadcast } = useSessionBroadcast(sessionId ?? undefined, () => {});
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [catalog, setCatalog] = useState<Resource[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickedId, setPickedId] = useState("");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<GrantDelivery>("reward");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [listReady, setListReady] = useState(false);

  const pickResource = !resource;
  const pickCrawlers = !crawler;

  useEffect(() => {
    if (!open) return;
    setSelectedIds(crawler ? [crawler.id] : []);
    setPickedId(resource?.id ?? "");
    setQuery("");
    setMode("reward");
    setMessage("");
    setError("");
    setBusy(false);
    setListReady(false);
  }, [open, crawler, resource]);

  useEffect(() => {
    if (!open || !sessionId) return;
    let cancelled = false;

    async function load() {
      if (crawlersProp && crawlersProp.length > 0) {
        setCrawlers(crawlersProp);
      } else {
        const { data } = await supabase.from("crawlers").select("*").eq("session_id", sessionId);
        if (cancelled) return;
        const rows = ((data as Crawler[]) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, "es"));
        setCrawlers(rows);
      }
      if (pickResource) {
        if (resourcesProp !== undefined) {
          setCatalog(grantableResources(resourcesProp));
        } else {
          const { data } = await supabase.from("resources").select("*").eq("session_id", sessionId);
          if (cancelled) return;
          setCatalog(grantableResources((data as Resource[]) ?? []));
        }
      }
      if (!cancelled) setListReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, sessionId, crawlersProp, resourcesProp, pickResource, supabase]);

  const chosen = resource ?? catalog.find((item) => item.id === pickedId) ?? null;
  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalog.filter((item) => {
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        objectTypeLabel(item).toLowerCase().includes(needle)
      );
    });
  }, [catalog, query]);

  function toggleCrawler(id: string) {
    if (!pickCrawlers) return;
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAll() {
    if (selectedIds.length === crawlers.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(crawlers.map((item) => item.id));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!chosen || selectedIds.length === 0) {
      setError(
        pickResource
          ? "Elige qué das y a quién."
          : "Elige al menos un mazmorrero.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const { error: grantError } = await grantResourceToCrawlers(supabase, {
      resourceId: chosen.id,
      crawlerIds: selectedIds,
      mode,
      message,
    });
    if (grantError) {
      setBusy(false);
      setError(grantError.message);
      return;
    }
    if (mode !== "silent") {
      await broadcast("cinematic", grantCinematicPayload(mode, chosen, message));
    }
    setBusy(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      size={pickResource ? "lg" : "md"}
      eyebrow={`${BRAND} — ${GIVE_TO_CRAWLER.toUpperCase()}`}
      title={resource?.name ?? crawler?.name ?? GIVE_TO_CRAWLER}
      subtitle={
        pickCrawlers
          ? "Elige a quién se lo lleva. Puedes marcar varios."
          : "Equipo, objeto o caja de loot. El Sistema se lo clava en el inventario."
      }
      action={
        resource ? <ResourceKindMark resource={resource} /> : <Gift size={18} className="text-[var(--orange-400)]" />
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {pickResource ? (
          <div className="space-y-2">
            <Input
              label="Qué das"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar equipo, objeto o caja"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.7)] p-1">
              {available.map((item) => {
                const selected = pickedId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPickedId(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                      selected
                        ? "border border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)]"
                        : "border border-transparent hover:bg-[rgba(0,212,255,0.06)]",
                    )}
                  >
                    <ResourceKindMark resource={item} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-1)]">{item.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                      {objectTypeLabel(item)}
                    </span>
                  </button>
                );
              })}
              {available.length === 0 ? (
                <p className="px-2 py-3 text-sm text-[var(--text-4)]">
                  {!listReady
                    ? "Consultando al Sistema…"
                    : catalog.length === 0
                      ? "No hay objetos, equipo ni cajas que dar."
                      : "Nada coincide."}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {pickCrawlers ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-label">Mazmorreros</p>
              {crawlers.length > 1 ? (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-cyan)] hover:underline"
                >
                  {selectedIds.length === crawlers.length ? "Ninguno" : "Todos"}
                </button>
              ) : null}
            </div>
            {crawlers.length === 0 ? (
              <p className="text-sm text-[var(--text-3)]">
                {listReady ? "No hay mazmorreros en esta sesión." : "Consultando al Sistema…"}
              </p>
            ) : (
              <ul className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                {crawlers.map((entry) => {
                  const selected = selectedIds.includes(entry.id);
                  const src = crawlerAvatarUrl(entry.name, entry.portrait_url);
                  return (
                    <li key={entry.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                          selected
                            ? "border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)]"
                            : "border-[var(--stroke-glass)] hover:border-[var(--stroke-cyan)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={() => toggleCrawler(entry.id)}
                        />
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-9 w-9 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--stroke-glass)] font-display text-[10px] text-[var(--cyan-400)]">
                            {crawlerInitials(entry.name)}
                          </span>
                        )}
                        <span className="min-w-0 truncate text-sm font-medium text-[var(--text-1)]">
                          {entry.name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : crawler ? (
          <p className="text-sm text-[var(--text-2)]">
            Destino: <span className="text-[var(--text-1)]">{crawler.name}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {GRANT_DELIVERY_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={
                mode === option.value
                  ? option.value === "penalty"
                    ? "danger"
                    : option.value === "reward"
                      ? "energy"
                      : "neon"
                  : "ghost"
              }
              onClick={() => setMode(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <Textarea
          label="Mensaje del Sistema"
          placeholder={`${BRAND} ha decidido que te mereces un premio. Probablemente por accidente.`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant={mode === "penalty" ? "danger" : "energy"}
            loading={busy}
            disabled={!chosen || selectedIds.length === 0 || !isGrantableResource(chosen)}
          >
            <Gift size={15} strokeWidth={1.75} />
            {GIVE_TO_CRAWLER}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
