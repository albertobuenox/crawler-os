"use client";

import { useEffect, useMemo, useState } from "react";
import { useRealtimeTable } from "@/hooks/useSession";
import { LayoutGrid, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AdminInRoomButton } from "@/components/hud/AdminInRoomButton";
import { SceneCanvasEditor } from "@/components/hud/SceneCanvasEditor";
import { SceneSpectator } from "@/components/hud/SceneSpectator";
import { SceneSheetPanel } from "@/components/hud/SceneSheetPanel";
import { useAdminInRoom } from "@/hooks/useAdminInRoom";
import type { DmMob, GameSession, Resource } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { crawlerAvatarUrl, crawlerInitials } from "@/lib/crawler-art";
import { SCENE_LABEL } from "@/lib/copy";
import { cn } from "@/lib/utils";

type CrawlerOpt = {
  id: string;
  name: string;
  portrait_url: string | null;
  avatar_emotion: string | null;
};

export default function DMTablePage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<CrawlerOpt[]>([]);
  const [monsters, setMonsters] = useState<Resource[]>([]);
  const [maps, setMaps] = useState<Resource[]>([]);
  const [mobs, setMobs] = useState<DmMob[]>([]);
  const [view, setView] = useState<"canvas" | string>("canvas");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const admin = useAdminInRoom(session?.id);

  useEffect(() => {
    void load();
  }, []);

  useRealtimeTable("dm_mobs", session ? `session_id=eq.${session.id}` : "session_id=eq.none", () => {
    if (!session) return;
    void supabase
      .from("dm_mobs")
      .select("*")
      .eq("session_id", session.id)
      .order("name")
      .then(({ data }) => setMobs((data as DmMob[]) ?? []));
  });

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase
      .from("session_members")
      .select("session_id, sessions(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sess = castSession(member?.sessions);
    setSession(sess ?? null);
    if (!sess) return;
    const [{ data: roster }, { data: resources }, { data: mobRows }] = await Promise.all([
      supabase
        .from("crawlers")
        .select("id, name, portrait_url, avatar_emotion")
        .eq("session_id", sess.id)
        .order("name"),
      supabase
        .from("resources")
        .select("*")
        .eq("session_id", sess.id)
        .in("kind", ["monster", "map"])
        .order("name"),
      supabase.from("dm_mobs").select("*").eq("session_id", sess.id).order("name"),
    ]);
    const catalog = (resources as Resource[]) ?? [];
    setCrawlers((roster as CrawlerOpt[]) ?? []);
    setMonsters(catalog.filter((r) => r.kind === "monster"));
    setMaps(catalog.filter((r) => r.kind === "map"));
    setMobs((mobRows as DmMob[]) ?? []);
  }

  const focus = useMemo(
    () => (view === "canvas" ? null : crawlers.find((c) => c.id === view) ?? null),
    [crawlers, view]
  );

  function openCrawler(id: string) {
    setView(id);
    if (sheetId) setSheetId(id);
  }

  return (
    <div className="-my-8 -mr-10 -ml-16 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-[var(--void-950)] px-3 py-3 pl-4">
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <p className="mr-2 font-display text-[10px] tracking-[0.18em] text-[var(--cyan-400)]">
          {SCENE_LABEL} / CONTROL
        </p>
        <button
          type="button"
          onClick={() => setView("canvas")}
          className={cn(
            "flex h-10 items-center gap-2 rounded-[12px] border px-3 font-display text-[11px] tracking-wide",
            view === "canvas"
              ? "border-[var(--stroke-cyan-hot)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
              : "border-[var(--stroke-glass)] text-[var(--text-2)] hover:text-[var(--text-1)]"
          )}
        >
          <LayoutGrid size={14} />
          Lienzo
        </button>
        <span className="hidden h-5 w-px bg-[var(--stroke-glass)] sm:block" />
        {crawlers.map((crawler) => {
          const src = crawlerAvatarUrl(crawler.name, crawler.portrait_url);
          const active = view === crawler.id;
          return (
            <button
              key={crawler.id}
              type="button"
              onClick={() => openCrawler(crawler.id)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-[12px] border px-2 pr-3",
                active
                  ? "border-[var(--gold-400)] shadow-[var(--glow-gold)]"
                  : "border-[var(--stroke-glass)] hover:border-[var(--stroke-cyan)]"
              )}
            >
              <span className="h-7 w-7 overflow-hidden rounded-[8px] bg-[rgba(8,10,18,0.85)]">
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-[9px] text-[var(--cyan-400)]">
                    {crawlerInitials(crawler.name)}
                  </span>
                )}
              </span>
              <span className="font-display text-[11px] tracking-wide">{crawler.name}</span>
            </button>
          );
        })}
        {session && (
          <AdminInRoomButton
            active={admin.active}
            pending={admin.pending}
            onToggle={() => void admin.setAdminInRoom(!admin.active)}
          />
        )}
        {focus && (
          <button
            type="button"
            onClick={() => setSheetId(sheetId === focus.id ? null : focus.id)}
            className={cn(
              "flex h-10 items-center gap-2 rounded-[12px] border px-3 font-display text-[11px] tracking-wide",
              sheetId
                ? "border-[var(--stroke-magenta)] text-[var(--magenta-400)] shadow-[var(--glow-magenta)]"
                : "border-[var(--stroke-glass)] text-[var(--text-2)]"
            )}
          >
            <ScrollText size={14} />
            Hoja
          </button>
        )}
      </header>

      {!session && (
        <p className="well flex flex-1 items-center justify-center text-sm text-[var(--text-3)]">
          No hay sesión activa. El dungeon está aburrido.
        </p>
      )}

      {session && (
        <div className="relative flex min-h-0 flex-1 gap-3">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {view === "canvas" ? (
              <SceneCanvasEditor
                sessionId={session.id}
                crawlers={crawlers}
                monsters={monsters}
                maps={maps}
                mobs={mobs}
              />
            ) : (
              <SceneSpectator
                sessionId={session.id}
                crawlerId={view}
                crawlerName={focus?.name}
                onOpenSheet={(id) => {
                  setView(id);
                  setSheetId(id);
                }}
              />
            )}
          </div>
          {sheetId && (
            <SceneSheetPanel
              crawlerId={sheetId}
              sessionId={session.id}
              onClose={() => setSheetId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
