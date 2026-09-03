"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/copy";
import type { CrawlerStatus, UserRole } from "@/lib/types";
import { Cpu, User } from "lucide-react";

type LobbyCrawler = {
  id: string;
  name: string;
  race: string | null;
  class_name: string | null;
  level: number;
  status: CrawlerStatus;
  session_code: string | null;
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
      router.push(body.redirect || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar al dungeon");
      setEntering(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <GlassPanel className="relative z-10 w-full max-w-[480px]" title="THE SYSTEM" subtitle="CRAWLER OS">
        <p className="mb-4 text-center text-sm text-[var(--text-3)]">¿Quién entra al dungeon?</p>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {(
            [
              { r: "dm" as const, label: "Dungeon Master", icon: Cpu, glow: "var(--glow-cyan)" },
              { r: "crawler" as const, label: "Crawler", icon: User, glow: "var(--glow-magenta)" },
            ] as const
          ).map(({ r, label, icon: Icon, glow }) => (
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
                "well flex flex-col items-center gap-2 rounded-xl p-4 transition-all",
                role === r && "border-[var(--stroke-cyan-hot)]"
              )}
              style={role === r ? { boxShadow: glow } : undefined}
            >
              <Icon size={24} className={role === r ? "text-[var(--cyan-400)]" : "text-[var(--text-3)]"} />
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
              <p className="text-center text-sm text-[var(--text-3)]">The System está cargando…</p>
            )}
            {!loadingList && crawlers.length === 0 && !error && (
              <p className="well rounded-xl p-4 text-center text-sm text-[var(--text-2)]">
                Aún no hay participantes de la mazmorra creados
              </p>
            )}
            {!loadingList &&
              crawlers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={entering}
                  onClick={() => enter({ crawlerId: c.id })}
                  className="well flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all hover:border-[var(--stroke-magenta)]"
                >
                  <span>
                    <span className="block font-display text-sm text-[var(--text-1)]">{c.name}</span>
                    <span className="text-xs text-[var(--text-cyan)]">
                      LV {c.level} · {c.class_name || c.race || "Crawler"}
                    </span>
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </button>
              ))}
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-[var(--danger)]">{error}</p>}
      </GlassPanel>
    </main>
  );
}
