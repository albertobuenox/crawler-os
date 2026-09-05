"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Home,
  Users,
  Database,
  Map,
  LayoutGrid,
  Dices,
  Bell,
  ScrollText,
  Settings,
  User,
  Backpack,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/hud/EventLog";
import { HudTooltip } from "@/components/hud/HudTooltip";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { BRAND, SCENE_LABEL } from "@/lib/copy";
import { SkillTimerChip } from "@/components/hud/SkillTimerPanel";
import { CommandPaletteTrigger } from "@/components/layout/CommandPalette";
import { useCrawlerAdminLocked } from "@/components/layout/CrawlerAdminLock";

const dmNav = [
  { href: "/dm", icon: Home, label: "Sesión", glow: "var(--glow-purple)", disabled: false },
  { href: "/dm/crawlers", icon: Users, label: "Crawlers", glow: "var(--glow-magenta)" },
  { href: "/dm/skills", icon: Sparkles, label: "Skills", glow: "var(--glow-gold)" },
  { href: "/dm/resources", icon: Database, label: "Recursos", glow: "var(--glow-cyan)" },
  { href: "/dm/world", icon: Map, label: "Mundo", glow: "var(--glow-gold)" },
  { href: "/dm/table", icon: LayoutGrid, label: SCENE_LABEL, glow: "var(--glow-cyan)" },
  { href: "/dm/notes", icon: StickyNote, label: "Notas del Master", glow: "var(--glow-gold)" },
  { href: "/dm/dice", icon: Dices, label: "Dados", glow: "var(--glow-orange)", disabled: true },
  { href: "/dm/notifications", icon: Bell, label: "Sistema", glow: "var(--glow-orange)", disabled: true },
  { href: "/dm/log", icon: ScrollText, label: "Registro", glow: "var(--glow-cyan)", disabled: true },
  { href: "/dm/settings", icon: Settings, label: "Ajustes", glow: "var(--glow-purple)", disabled: true },
];

export function DMNavRail({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();
  const railRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && railRef.current?.contains(active)) {
      active.blur();
    }
  }, [pathname]);

  return (
    <div className="relative z-[var(--z-nav)] hidden w-14 shrink-0 lg:block">
      <nav
        ref={railRef}
        className="dm-nav-rail group/rail absolute inset-y-0 left-0 flex flex-col gap-1 overflow-hidden border-r border-[var(--stroke-glass)] py-4 backdrop-blur-xl"
      >
        <p className="mb-3 flex h-6 items-center overflow-hidden px-3 font-display text-[8px] tracking-[0.22em] text-[var(--cyan-400)]">
          <span className="shrink-0">DM</span>
          <span className="ml-2 whitespace-nowrap opacity-0 transition-opacity duration-[280ms] ease-[var(--ease-hologram)] group-hover/rail:opacity-100 group-has-[:focus-visible]/rail:opacity-100">
            / CONTROL
          </span>
        </p>
        {dmNav.map(({ href, icon: Icon, label, glow, disabled }) => {
          const active = pathname === href || (href !== "/dm" && pathname.startsWith(href));
          if (disabled) {
            return (
              <span
                key={href}
                title={`${label} — no disponible`}
                aria-disabled="true"
                className="dm-nav-item relative flex cursor-default items-center overflow-hidden text-[var(--text-4)] opacity-35 hover:cursor-default"
              >
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="dm-nav-label whitespace-nowrap text-[12px] font-medium tracking-wide">
                  {label}
                </span>
              </span>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "dm-nav-item relative flex items-center overflow-hidden transition-colors duration-[180ms]",
                active
                  ? "well text-[var(--cyan-400)]"
                  : "text-[var(--text-3)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-1)]"
              )}
              style={active ? { boxShadow: glow } : undefined}
            >
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon size={16} strokeWidth={1.75} />
                {href.includes("notifications") && <NotificationBadge count={unread} />}
              </span>
              <span className="dm-nav-label whitespace-nowrap text-[12px] font-medium tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

const crawlerNav = [
  { href: "/crawler", icon: Home, label: "Inicio", color: "var(--purple-500)" },
  { href: "/crawler/sheet", icon: User, label: "Hoja", color: "var(--magenta-500)" },
  { href: "/crawler/inventory", icon: Backpack, label: "Objetos", color: "var(--cyan-500)" },
  { href: "/crawler/skills", icon: Sparkles, label: "Habilidades", color: "var(--cyan-500)" },
  { href: "/crawler/table", icon: LayoutGrid, label: SCENE_LABEL, color: "var(--gold-400)" },
  { href: "/crawler/notifications", icon: Bell, label: "Sistema", color: "var(--orange-500)" },
];

export function CrawlerBottomNav() {
  const pathname = usePathname();
  const unread = useUnreadNotifications("unread-notifications-nav");
  const locked = useCrawlerAdminLocked();

  return (
    <nav
      data-header-dim=""
      className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] flex h-[72px] items-center justify-around border-t border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.85)] px-2 backdrop-blur-xl lg:hidden"
    >
      {crawlerNav.map(({ href, icon: Icon, label, color }) => {
        const active = pathname === href || (href !== "/crawler" && pathname.startsWith(href));
        const itemClass = cn(
          "relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px]",
          active ? "text-[var(--text-1)]" : "text-[var(--text-3)]",
          locked && href !== "/crawler/table" && "pointer-events-none opacity-35"
        );
        const inner = (
          <>
            <span
              className="flex h-10 w-10 items-center justify-center rounded-[14px] well"
              style={active ? { boxShadow: `0 0 16px ${color}66` } : undefined}
            >
              <Icon size={20} style={active ? { color } : undefined} />
            </span>
            {label}
            {href.includes("notifications") && <NotificationBadge count={unread} />}
          </>
        );
        if (locked && href !== "/crawler/table") {
          return (
            <span key={href} aria-disabled="true" className={itemClass}>
              {inner}
            </span>
          );
        }
        return (
          <Link key={href} href={href} className={itemClass}>
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

function dmParentHref(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "dm" || segments.length < 2) return null;
  segments.pop();
  return `/${segments.join("/")}`;
}

export function DMTopBar({ sessionCode, sessionName }: { sessionCode?: string; sessionName?: string }) {
  const pathname = usePathname();
  const parentHref = dmParentHref(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--stroke-glass)] px-6 pr-28">
      <div className="flex min-w-0 items-center gap-3">
        {parentHref ? (
          <HudTooltip text="Volver" side="bottom" className="group shrink-0">
            <Link
              href={parentHref}
              aria-label="Volver al menú anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.55)] text-[var(--text-3)] transition-[color,border-color,box-shadow,background-color] duration-[var(--t-ui)] ease-[var(--ease-hologram)] hover:border-[var(--stroke-cyan)] hover:bg-[rgba(0,212,255,0.08)] hover:text-[var(--cyan-400)] hover:shadow-[var(--glow-cyan)] focus-visible:border-[var(--stroke-cyan-hot)] focus-visible:text-[var(--cyan-300)] focus-visible:shadow-[var(--glow-cyan)]"
            >
              <ChevronLeft size={18} strokeWidth={1.75} />
            </Link>
          </HudTooltip>
        ) : null}
        <div className="min-w-0">
          <p className="text-label text-[var(--text-cyan)]">{BRAND} / DUNGEON MASTER</p>
          <h1 className="font-display text-lg tracking-wide">{sessionName ?? "Control de sesión"}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {sessionCode && <SkillTimerChip />}
        <CommandPaletteTrigger />
        {sessionCode && (
          <Link
            href={`/table/${sessionCode}`}
            target="_blank"
            className="text-xs text-[var(--cyan-400)] hover:text-[var(--text-1)]"
          >
            {SCENE_LABEL} TV
          </Link>
        )}
      </div>
    </header>
  );
}

