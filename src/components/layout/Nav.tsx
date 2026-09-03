"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/hud/EventLog";

const dmNav = [
  { href: "/dm", icon: Home, label: "Sesión", glow: "var(--glow-purple)" },
  { href: "/dm/crawlers", icon: Users, label: "Crawlers", glow: "var(--glow-magenta)" },
  { href: "/dm/resources", icon: Database, label: "Recursos", glow: "var(--glow-cyan)" },
  { href: "/dm/world", icon: Map, label: "Mundo", glow: "var(--glow-gold)" },
  { href: "/dm/table", icon: LayoutGrid, label: "Mesa", glow: "var(--glow-cyan)" },
  { href: "/dm/dice", icon: Dices, label: "Dados", glow: "var(--glow-orange)" },
  { href: "/dm/notifications", icon: Bell, label: "Sistema", glow: "var(--glow-orange)" },
  { href: "/dm/log", icon: ScrollText, label: "Registro", glow: "var(--glow-cyan)" },
  { href: "/dm/settings", icon: Settings, label: "Ajustes", glow: "var(--glow-purple)" },
];

export function DMNavRail({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();

  return (
    <nav className="hidden w-[72px] shrink-0 flex-col items-center gap-2 border-r border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.5)] py-4 lg:flex">
      <p className="mb-2 font-display text-[8px] tracking-[0.2em] text-[var(--cyan-400)]">DM</p>
      {dmNav.map(({ href, icon: Icon, label, glow }) => {
        const active = pathname === href || (href !== "/dm" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-[14px] transition-all",
              active ? "well text-[var(--cyan-400)]" : "text-[var(--text-3)] hover:text-[var(--text-1)]"
            )}
            style={active ? { boxShadow: glow } : undefined}
          >
            <Icon size={20} />
            {href.includes("notifications") && <NotificationBadge count={unread} />}
          </Link>
        );
      })}
    </nav>
  );
}

const crawlerNav = [
  { href: "/crawler", icon: Home, label: "Inicio", color: "var(--purple-500)" },
  { href: "/crawler/sheet", icon: User, label: "Hoja", color: "var(--magenta-500)" },
  { href: "/crawler/inventory", icon: Backpack, label: "Objetos", color: "var(--cyan-500)" },
  { href: "/crawler/skills", icon: Sparkles, label: "Habilidades", color: "var(--cyan-500)" },
  { href: "/crawler/table", icon: LayoutGrid, label: "Mesa", color: "var(--gold-400)" },
  { href: "/crawler/notifications", icon: Bell, label: "Sistema", color: "var(--orange-500)" },
];

export function CrawlerBottomNav({ unread = 0 }: { unread?: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[var(--z-nav)] flex h-[72px] items-center justify-around border-t border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.85)] px-2 backdrop-blur-xl lg:hidden">
      {crawlerNav.map(({ href, icon: Icon, label, color }) => {
        const active = pathname === href || (href !== "/crawler" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px]",
              active ? "text-[var(--text-1)]" : "text-[var(--text-3)]"
            )}
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-[14px] well"
              style={active ? { boxShadow: `0 0 16px ${color}66` } : undefined}
            >
              <Icon size={20} style={active ? { color } : undefined} />
            </span>
            {label}
            {href.includes("notifications") && <NotificationBadge count={unread} />}
          </Link>
        );
      })}
    </nav>
  );
}

export function DMTopBar({ sessionCode, sessionName }: { sessionCode?: string; sessionName?: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[var(--stroke-glass)] px-6">
      <div>
        <p className="text-label text-[var(--text-cyan)]">SYSTEM / DUNGEON MASTER</p>
        <h1 className="font-display text-lg tracking-wide">{sessionName ?? "Control de sesión"}</h1>
      </div>
      {sessionCode && (
        <div className="flex items-center gap-3">
          <code className="rounded-lg well px-3 py-1.5 font-mono-system text-sm text-[var(--cyan-400)]">
            {sessionCode}
          </code>
          <Link
            href={`/table/${sessionCode}`}
            target="_blank"
            className="text-xs text-[var(--cyan-400)] hover:text-[var(--text-1)]"
          >
            Mesa TV
          </Link>
        </div>
      )}
    </header>
  );
}

export function CrawlerStatusStrip({
  name,
  level,
  hpBoxes,
  conEnhanced,
  mana,
  manaMax,
}: {
  name: string;
  level: number;
  hpBoxes: number;
  conEnhanced: number;
  mana: number;
  manaMax: number;
}) {
  const boxesRemaining = 10 - hpBoxes;
  return (
    <div className="sticky top-0 z-[var(--z-nav)] border-b border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.9)] px-4 py-2 backdrop-blur-md">
      <div className="flex items-center justify-between text-xs">
        <span className="font-display text-sm text-[var(--text-1)]">{name}</span>
        <span className="text-[var(--gold-400)]">LV {level}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <span className="text-label">Casillas HP</span>
          <div className="font-stat text-[var(--hp)]">{boxesRemaining}/10</div>
        </div>
        <div>
          <span className="text-label">Maná</span>
          <div className="font-stat text-[var(--mana)]">
            {mana}/{manaMax}
          </div>
        </div>
      </div>
    </div>
  );
}
