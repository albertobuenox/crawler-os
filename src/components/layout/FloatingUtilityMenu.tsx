"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, LogOut, Mail, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { NotificationInbox } from "@/components/hud/NotificationInbox";
import { HudTooltip } from "@/components/hud/HudTooltip";
import { cn } from "@/lib/utils";

export function FloatingUtilityMenu() {
  const [signingOut, setSigningOut] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const mailRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const isCrawler = pathname.startsWith("/crawler");
  const unread = useUnreadNotifications("unread-notifications-menu");
  const sheetActive = pathname.startsWith("/crawler/sheet");
  const mailActive = inboxOpen;

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <>
      {isCrawler && (
        <NotificationInbox open={inboxOpen} onOpenChange={setInboxOpen} mailRef={mailRef} />
      )}
      <div className="pointer-events-none fixed top-4 right-4 z-[var(--z-toast)]">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.88)] p-1 shadow-[var(--shadow-glass)] backdrop-blur-xl">
          {isCrawler && (
            <>
              <Link
                href="/crawler/sheet"
                aria-label="Hoja de personaje"
                title="Hoja de personaje"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-[var(--t-ui)]",
                  sheetActive
                    ? "text-[var(--magenta-500)]"
                    : "text-[var(--text-2)] hover:bg-[rgba(232,121,249,0.12)] hover:text-[var(--magenta-400)]"
                )}
              >
                <User size={15} strokeWidth={1.75} />
              </Link>
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
                    "relative flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-[var(--t-ui)]",
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
            </>
          )}
          <span
            aria-hidden="true"
            title="Documentación (próximamente)"
            className="flex h-8 w-8 cursor-default items-center justify-center rounded-full text-[var(--cyan-700)]"
          >
            <Book size={15} strokeWidth={1.75} />
          </span>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-2)] transition-colors duration-[var(--t-ui)] hover:bg-[rgba(255,59,92,0.12)] hover:text-[var(--danger)] disabled:opacity-45"
          >
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </>
  );
}
