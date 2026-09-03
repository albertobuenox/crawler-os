"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { NotificationInbox } from "@/components/hud/NotificationInbox";
import { HudTooltip } from "@/components/hud/HudTooltip";
import { cn } from "@/lib/utils";
import { SCENE_LABEL } from "@/lib/copy";
import type { Crawler } from "@/lib/types";

type HeaderCrawler = Pick<
  Crawler,
  "id" | "name" | "level" | "hp_boxes_filled" | "mana_current" | "mana_max"
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
      .select("id, name, level, hp_boxes_filled, mana_current, mana_max");

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
      .on("postgres_changes", { event: "*", schema: "public", table: "crawlers" }, () => load())
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

  const hpLeft = crawler ? 10 - crawler.hp_boxes_filled : 0;

  return (
    <>
      <NotificationInbox open={inboxOpen} onOpenChange={setInboxOpen} mailRef={mailRef} />
      <header className="sticky top-0 z-[var(--z-nav)] shrink-0 border-b border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.92)] px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/crawler/table"
            className="min-w-0 shrink-0 rounded-md outline-offset-4"
            aria-label={crawler ? `${crawler.name} — ir a ${SCENE_LABEL}` : SCENE_LABEL}
          >
            <span className="block truncate font-display text-sm text-[var(--text-1)] transition-colors duration-[var(--t-ui)] hover:text-[var(--cyan-300)]">
              {crawler?.name ?? "Crawler"}
            </span>
            {crawler && (
              <span className="text-label block text-[var(--hp)]">
                Casillas HP {hpLeft}/10
              </span>
            )}
          </Link>

          {crawler && (
            <div className="hidden min-w-0 flex-1 text-center sm:block">
              <span className="text-label">Maná</span>
              <div className="font-stat text-[var(--mana)]">
                {crawler.mana_current}/{crawler.mana_max}
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-3">
            {crawler && (
              <>
                <div className="text-center sm:hidden">
                  <span className="text-label">Maná</span>
                  <div className="font-stat text-xs text-[var(--mana)]">
                    {crawler.mana_current}/{crawler.mana_max}
                  </div>
                </div>
                <span className="font-stat text-sm text-[var(--gold-400)]">LV {crawler.level}</span>
              </>
            )}

            <div className="flex items-center gap-0.5 rounded-full border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.88)] p-1 shadow-[var(--shadow-glass)]">
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
