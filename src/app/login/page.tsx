"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, BRAND } from "@/lib/copy";
import { crawlerAvatarUrl, crawlerInitials } from "@/lib/crawler-art";
import type { CrawlerStatus, UserRole } from "@/lib/types";
import { Cpu, User } from "lucide-react";
import { markLoginNoticePending } from "@/lib/login-notice";
import { LoginBackdrop } from "./LoginBackdrop";

type LobbyCrawler = {
  id: string;
  name: string;
  race: string | null;
  class_name: string | null;
  level: number;
  status: CrawlerStatus;
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [crawlers, setCrawlers] = useState<LobbyCrawler[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role !== "crawler") return;
    let cancelled = false;
    setLoadingList(true);
    setError("");
    fetch("/api/lobby/crawlers")
      .then(async (res) => {
        const body = (await res.json()) as { crawlers?: LobbyCrawler[]; error?: string };
        if (!res.ok) throw new Error(body.error || "No se pudieron cargar los crawlers");
        if (!cancelled) setCrawlers(body.crawlers ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCrawlers([]);
          setError(err instanceof Error ? err.message : "No se pudieron cargar los crawlers");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role]);

  async function enter(payload: { role: "dm" } | { crawlerId: string }) {
    setEntering(true);
    setError("");
    try {
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { redirect?: string; error?: string };
      if (!res.ok) throw new Error(body.error || "No se pudo entrar");
      markLoginNoticePending();
      router.push(body.redirect || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar al dungeon");
      setEntering(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden p-4">
      <LoginBackdrop />
      <div className="relative z-10 flex w-full max-w-[480px] flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/logo.webp"
          alt="Dungeon Crawler World Earth"
          className="relative z-20 mb-6 w-[min(42%,168px)] object-contain mix-blend-screen drop-shadow-[0_0_28px_rgba(0,212,255,0.35)] sm:mb-8"
        />
        <div className="hud-frame w-full">
      <GlassPanel className="hud-panel w-full" variant="system" title={BRAND} subtitle="CRAWLER OS">
        <p className="mb-4 text-center text-sm text-[var(--cyan-400)] [text-shadow:0_0_12px_rgba(0,212,255,0.55)]">
          ¿Quién entra al dungeon?
        </p>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {(
            [
              { r: "dm" as const, label: "Dungeon Master", icon: Cpu, accent: "cyan" as const },
              { r: "crawler" as const, label: "Crawler", icon: User, accent: "magenta" as const },
            ] as const
          ).map(({ r, label, icon: Icon, accent }) => (
            <button
              key={r}
              type="button"
              disabled={entering}
              onClick={() => {
                setError("");
                setRole(r);
                if (r === "dm") void enter({ role: "dm" });
              }}
              className={cn(
                "well hud-tile flex flex-col items-center gap-2 p-4",
                accent === "magenta" && "hud-tile--magenta",
                role === r && "is-live"
              )}
            >
              <Icon
                size={24}
                className={role === r ? (accent === "magenta" ? "text-[var(--magenta-400)]" : "text-[var(--cyan-400)]") : "text-[var(--text-3)]"}
              />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>

        {role === "dm" && entering && (
          <p className="text-center text-sm text-[var(--text-cyan)]">Conectando al Dungeon Master…</p>
        )}

        {role === "crawler" && (
          <div className="space-y-3">
            <p className="text-label text-center">Participantes de la mazmorra</p>
            {loadingList && (
              <p className="text-center text-sm text-[var(--text-3)]">{BRAND} está cargando…</p>
            )}
            {!loadingList && crawlers.length === 0 && !error && (
              <p className="well hud-tile hud-tile--magenta p-4 text-center text-sm text-[var(--text-2)]">
                Aún no hay participantes de la mazmorra creados
              </p>
            )}
            {!loadingList &&
              crawlers.map((c) => {
                const avatarSrc = crawlerAvatarUrl(c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={entering}
                    onClick={() => enter({ crawlerId: c.id })}
                    className="well hud-tile hud-tile--magenta flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarSrc}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-[var(--stroke-magenta)] sm:h-16 sm:w-16"
                        />
                      ) : (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[rgba(16,19,31,0.82)] font-display text-xs tracking-widest text-[var(--cyan-400)] sm:h-16 sm:w-16">
                          {crawlerInitials(c.name)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block font-display text-sm text-[var(--text-1)]">{c.name}</span>
                        <span className="text-xs text-[var(--text-cyan)]">
                          LV {c.level} · {c.class_name || c.race || "Sin clase"}
                        </span>
                      </span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                  </button>
                );
              })}
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-[var(--danger)]">{error}</p>}
      </GlassPanel>
        </div>
      </div>
    </main>
  );
}
