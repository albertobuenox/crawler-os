"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Castle, LayoutGrid, LogOut, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { NotificationInbox } from "@/components/hud/NotificationInbox";
import { HudTooltip } from "@/components/hud/HudTooltip";
import { ResourceBar } from "@/components/hud/HealthBoxes";
import { updateCrawlerVitals } from "@/lib/crawler-vitals";
import { clampLifeBoxes, clampMana, healthBarColor, lifeToBoxesFilled } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { crawlerIdentityLine, mazmorreroNumberLabel, SCENE_LABEL } from "@/lib/copy";
import type { Crawler } from "@/lib/types";

type HeaderCrawler = Pick<
  Crawler,
  "id" | "name" | "level" | "race" | "class_name" | "crawler_number" | "hp_boxes_filled" | "mana_current" | "mana_max"
>;

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-[var(--t-ui)]";

export function CrawlerHeader() {
  const supabase = createClient();
  const pathname = usePathname();
  const [crawler, setCrawler] = useState<HeaderCrawler | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const mailRef = useRef<HTMLButtonElement>(null);
  const unread = useUnreadNotifications("unread-notifications-header");

  const sheetActive = pathname.startsWith("/crawler/sheet");
  const sceneActive = pathname.startsWith("/crawler/table");
  const mailActive = inboxOpen;

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from("session_members")
      .select("crawler_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    let query = supabase
      .from("crawlers")
      .select("id, name, level, race, class_name, crawler_number, hp_boxes_filled, mana_current, mana_max");

    if (member?.crawler_id) {
      query = query.eq("id", member.crawler_id);
    } else {
      query = query.eq("owner_user_id", user.id);
    }

    const { data } = await query.maybeSingle();
    setCrawler((data as HeaderCrawler) ?? null);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("crawler-header")
      .on("postgres_changes", { event: "*", schema: "public", table: "crawlers" }, (payload) => {
        const row = payload.new as Partial<HeaderCrawler> & { id?: string };
        if (!row?.id) {
          void load();
          return;
        }
        setCrawler((prev) => {
          if (!prev || prev.id !== row.id) return prev;
          return {
            ...prev,
            name: row.name ?? prev.name,
            level: row.level ?? prev.level,
            race: row.race !== undefined ? row.race : prev.race,
            class_name: row.class_name !== undefined ? row.class_name : prev.class_name,
            crawler_number: row.crawler_number !== undefined ? row.crawler_number : prev.crawler_number,
            hp_boxes_filled: row.hp_boxes_filled ?? prev.hp_boxes_filled,
            mana_current: row.mana_current ?? prev.mana_current,
            mana_max: row.mana_max ?? prev.mana_max,
          };
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, supabase]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <>
      <NotificationInbox open={inboxOpen} onOpenChange={setInboxOpen} mailRef={mailRef} />
      <header className="sticky top-0 z-[var(--z-nav)] shrink-0 border-b border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.92)] px-3 py-2 backdrop-blur-md sm:px-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
          <div data-header-dim="" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/crawler/table"
              aria-label="ir a la mazmorra"
              className={cn(
                "group/mazmorra grid h-9 shrink-0 grid-cols-[2.25rem_0fr] items-center overflow-hidden rounded-[10px] border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.88)]",
                "text-[var(--cyan-400)] shadow-[var(--shadow-glass)]",
                "transition-[grid-template-columns,border-color,box-shadow,color,background-color] duration-[var(--t-panel)] ease-[var(--ease-hologram)]",
                "hover:grid-cols-[2.25rem_1fr] hover:border-[var(--stroke-cyan-hot)] hover:bg-[rgba(0,212,255,0.14)] hover:text-[var(--cyan-300)] hover:shadow-[var(--glow-cyan)]",
                "focus-visible:grid-cols-[2.25rem_1fr] focus-visible:border-[var(--stroke-cyan-hot)] focus-visible:shadow-[var(--glow-cyan)]",
                sceneActive && "border-[var(--stroke-cyan-hot)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center">
                <Castle size={16} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 overflow-hidden">
                <span className="block whitespace-nowrap pr-3 font-display text-[10px] font-medium uppercase tracking-[0.16em] opacity-0 transition-opacity duration-[var(--t-ui)] delay-75 ease-[var(--ease-hologram)] group-hover/mazmorra:opacity-100 group-focus-visible/mazmorra:opacity-100">
                  ir a la mazmorra
                </span>
              </span>
            </Link>
            <Link
              href="/crawler/sheet"
              className="group/name hidden min-w-0 rounded-md outline-offset-4 md:block"
              aria-label={crawler ? `${crawler.name} — ir a la hoja de personaje` : "Hoja de personaje"}
            >
              <span className="block truncate font-display text-sm text-[var(--text-1)] transition-colors duration-[var(--t-ui)] group-hover/name:text-[var(--cyan-300)]">
                {crawler?.name ?? "Crawler"}
              </span>
              {crawler && (
                <span className="mt-0.5 block truncate font-stat text-[10px] tracking-wide text-[var(--text-3)] transition-colors duration-[var(--t-ui)] group-hover/name:text-[var(--cyan-400)]">
                  {crawlerIdentityLine(crawler)}
                </span>
              )}
            </Link>
          </div>

          {crawler ? (
            <HeaderVitals
              crawler={crawler}
              onLifeChange={(life) => {
                const next = clampLifeBoxes(life);
                setCrawler((prev) => (prev ? { ...prev, hp_boxes_filled: lifeToBoxesFilled(next) } : prev));
                void updateCrawlerVitals(crawler.id, { hp_boxes_filled: lifeToBoxesFilled(next) });
              }}
              onManaChange={(mana) => {
                const next = clampMana(mana, crawler.mana_max);
                setCrawler((prev) => (prev ? { ...prev, mana_current: next } : prev));
                void updateCrawlerVitals(crawler.id, { mana_current: next });
              }}
            />
          ) : (
            <span />
          )}

          <div className="flex items-center justify-end gap-3">
            <div
              data-utility-menu=""
              className="flex items-center gap-0.5 rounded-full border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.88)] p-1 shadow-[var(--shadow-glass)]"
            >
              <HudTooltip text="Hoja de personaje" side="bottom" className="group">
                <Link
                  href="/crawler/sheet"
                  aria-label="Hoja de personaje"
                  className={cn(
                    iconBtn,
                    sheetActive
                      ? "text-[var(--magenta-500)]"
                      : "text-[var(--text-2)] hover:bg-[rgba(232,121,249,0.12)] hover:text-[var(--magenta-400)]"
                  )}
                >
                  <User size={15} strokeWidth={1.75} />
                </Link>
              </HudTooltip>

              <HudTooltip text="Notificaciones" side="bottom" className="group">
                <button
                  ref={mailRef}
                  type="button"
                  data-mail-dock=""
                  aria-label={unread > 0 ? "Notificaciones sin leer" : "Notificaciones"}
                  aria-expanded={inboxOpen}
                  aria-haspopup="dialog"
                  onClick={() => setInboxOpen((v) => !v)}
                  className={cn(
                    iconBtn,
                    "relative",
                    mailActive
                      ? "text-[var(--orange-400)]"
                      : "text-[var(--text-2)] hover:bg-[rgba(249,115,22,0.12)] hover:text-[var(--orange-400)]"
                  )}
                >
                  <Mail size={15} strokeWidth={1.75} />
                  {unread > 0 && (
                    <span
                      className="absolute bottom-[5px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--danger)] shadow-[var(--glow-danger)] animate-pulse"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </HudTooltip>

              <HudTooltip text={SCENE_LABEL} side="bottom" className="group">
                <Link
                  href="/crawler/table"
                  aria-label={SCENE_LABEL}
                  className={cn(
                    iconBtn,
                    sceneActive
                      ? "text-[var(--gold-400)]"
                      : "text-[var(--text-2)] hover:bg-[rgba(245,158,11,0.12)] hover:text-[var(--gold-400)]"
                  )}
                >
                  <LayoutGrid size={15} strokeWidth={1.75} />
                </Link>
              </HudTooltip>

              <HudTooltip text="Cerrar sesión" side="bottom" className="group">
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signingOut}
                  aria-label="Cerrar sesión"
                  className={cn(
                    iconBtn,
                    "text-[var(--text-2)] hover:bg-[rgba(255,59,92,0.12)] hover:text-[var(--danger)] disabled:opacity-45"
                  )}
                >
                  <LogOut size={15} strokeWidth={1.75} />
                </button>
              </HudTooltip>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

function HeaderVitals({
  crawler,
  onLifeChange,
  onManaChange,
}: {
  crawler: HeaderCrawler;
  onLifeChange: (lifeBoxes: number) => void;
  onManaChange: (manaCurrent: number) => void;
}) {
  const life = clampLifeBoxes(10 - (crawler.hp_boxes_filled ?? 0));
  const mazmorrero = mazmorreroNumberLabel(crawler.crawler_number);
  return (
    <div data-header-dim="" className="w-[min(20rem,calc(100vw-11rem))] space-y-1 sm:w-80">
      {mazmorrero && (
        <p className="text-center font-display text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--gold-400)]">
          {mazmorrero}
        </p>
      )}
      <ResourceBar
        label="Vida"
        current={life}
        max={10}
        color={healthBarColor(life)}
        compact
        interactive
        onCurrentChange={onLifeChange}
      />
      <ResourceBar
        label="Maná"
        current={crawler.mana_current}
        max={crawler.mana_max}
        compact
        interactive
        onCurrentChange={onManaChange}
      />
    </div>
  );
}
