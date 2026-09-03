"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CrawlerStatus } from "@/lib/types";
import { crawlerAvatarUrl, crawlerInitials } from "@/lib/crawler-art";
import { cn } from "@/lib/utils";
import { HudTooltip } from "@/components/hud/HudTooltip";

export type PartyAvatar = {
  id: string;
  name: string;
  portrait_url: string | null;
  status: CrawlerStatus;
  level: number;
};

const MIN_SLOTS = 4;

const easeIn = [0.22, 1, 0.36, 1] as const;

const statusRing: Record<CrawlerStatus, string> = {
  exploring: "border-[var(--stroke-cyan)] shadow-[var(--glow-cyan)]",
  combat: "border-[var(--stroke-magenta)] shadow-[var(--glow-magenta)]",
  downed: "border-[var(--stroke-reward)] shadow-[var(--glow-orange)]",
  dead: "border-[var(--stroke-danger)] opacity-55",
  afk: "border-[var(--stroke-glass)]",
};

const statusPip: Record<CrawlerStatus, string> = {
  exploring: "bg-[var(--ok)]",
  combat: "bg-[var(--hp)] shadow-[var(--glow-danger)]",
  downed: "bg-[var(--orange-500)]",
  dead: "bg-[var(--offline)]",
  afk: "bg-[var(--offline)]",
};

function AvatarFrame({
  member,
  open,
  onToggle,
  duration,
}: {
  member?: PartyAvatar;
  open: boolean;
  onToggle: () => void;
  duration: number;
}) {
  if (!member) {
    return (
      <div
        className="aspect-square w-full rounded-[16px] border border-dashed border-[var(--stroke-glass)] bg-[rgba(16,19,31,0.55)]"
        aria-hidden="true"
      />
    );
  }

  const avatarSrc = crawlerAvatarUrl(member.name, member.portrait_url);

  return (
    <div className="flex flex-col" data-party-slot={member.id} data-open={open ? "" : undefined}>
      <button
        type="button"
        data-party-avatar=""
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`sheet-action-${member.id}`}
        className={cn(
          "relative aspect-square w-full cursor-pointer rounded-[16px] border-2 bg-[rgba(16,19,31,0.82)] transition-[border-color,box-shadow,filter] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
          statusRing[member.status],
          "hover:border-[var(--stroke-cyan-hot)] hover:shadow-[var(--glow-cyan)] hover:brightness-110",
          open && "border-[var(--stroke-cyan-hot)] shadow-[var(--glow-cyan)]"
        )}
      >
        <span className="absolute inset-0 overflow-hidden rounded-[14px]">
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center font-display text-sm tracking-widest text-[var(--cyan-400)] sm:text-base">
              {crawlerInitials(member.name)}
            </span>
          )}
        </span>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[var(--void-950)]",
            statusPip[member.status]
          )}
          aria-hidden="true"
        />
        <span className="sr-only">
          {member.name}, nivel {member.level}. Abrir ver hoja de personaje.
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="sheet-action"
            id={`sheet-action-${member.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration, ease: easeIn },
              opacity: { duration: duration * 0.75, ease: easeIn },
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              exit={{ y: -8 }}
              transition={{ duration, ease: easeIn }}
              className="pt-1.5"
            >
              <HudTooltip text="ver hoja de personaje" className="group block">
                <Link
                  href={`/crawler/sheet/${member.id}`}
                  aria-label="ver hoja de personaje"
                  className={cn(
                    "flex h-10 w-full cursor-pointer items-center justify-center rounded-[10px] border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.88)]",
                    "text-[var(--cyan-400)] shadow-[var(--shadow-glass)]",
                    "transition-[border-color,box-shadow,color,background-color,filter] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
                    "hover:border-[var(--stroke-cyan-hot)] hover:bg-[rgba(0,212,255,0.14)] hover:text-[var(--cyan-300)] hover:shadow-[var(--glow-cyan)] hover:brightness-110"
                  )}
                >
                  <Eye size={16} strokeWidth={1.75} />
                </Link>
              </HudTooltip>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PartyAvatarRail({ members }: { members: PartyAvatar[] }) {
  const slots = Math.max(MIN_SLOTS, members.length);
  const [openId, setOpenId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const duration = reduceMotion ? 0.01 : 0.2;

  useEffect(() => {
    if (!openId) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-party-slot][data-open]")) return;
      if (target?.closest("[data-party-avatar]")) return;
      setOpenId(null);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openId]);

  return (
    <aside
      aria-label="Personajes de la party"
      className="flex w-20 shrink-0 flex-col gap-2.5 overflow-visible sm:w-24 lg:w-28"
    >
      {Array.from({ length: slots }, (_, i) => {
        const member = members[i];
        const open = !!member && openId === member.id;
        return (
          <AvatarFrame
            key={member?.id ?? `empty-${i}`}
            member={member}
            open={open}
            onToggle={() => {
              if (!member) return;
              setOpenId((current) => (current === member.id ? null : member.id));
            }}
            duration={duration}
          />
        );
      })}
    </aside>
  );
}
