"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Eye, RotateCcw, SmilePlus } from "lucide-react";
import type { CrawlerStatus } from "@/lib/types";
import {
  AVATAR_EMOTION_LABEL,
  AVATAR_EMOTIONS,
  crawlerAvatarUrl,
  crawlerInitials,
  readStoredAvatarEmotions,
  writeStoredAvatarEmotions,
  type AvatarEmotion,
} from "@/lib/crawler-art";
import { healthBarColor, healthPercent } from "@/lib/rules";
import { cn } from "@/lib/utils";

export type PartyAvatar = {
  id: string;
  name: string;
  portrait_url: string | null;
  status: CrawlerStatus;
  level: number;
  hp_boxes_filled: number;
  mana_current: number;
  mana_max: number;
};

const MIN_SLOTS = 4;

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

function avatarBadgeName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function CornerTicks({ className }: { className?: string }) {
  const tick = "absolute h-2.5 w-2.5 border-[var(--gold-400)]";
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(tick, "-left-0.5 -top-0.5 border-l-2 border-t-2")} />
      <span className={cn(tick, "-right-0.5 -top-0.5 border-r-2 border-t-2")} />
      <span className={cn(tick, "-bottom-0.5 -left-0.5 border-b-2 border-l-2")} />
      <span className={cn(tick, "-bottom-0.5 -right-0.5 border-b-2 border-r-2")} />
    </span>
  );
}

function MiniVitalBar({
  member,
  name,
  isSelf,
}: {
  member: PartyAvatar;
  name: string;
  isSelf: boolean;
}) {
  const hpFilled = Math.min(Math.max(member.hp_boxes_filled, 0), 10);
  const lifeBoxes = 10 - hpFilled;
  const hpPct = healthPercent(hpFilled);
  const hpColor = healthBarColor(lifeBoxes);
  const manaMax = Math.max(member.mana_max, 0);
  const manaPct = manaMax > 0 ? Math.min(Math.max((member.mana_current / manaMax) * 100, 0), 100) : 0;

  return (
    <div className="mb-1 w-full">
      <p
        className={cn(
          "mb-0.5 truncate text-center font-display text-[8px] tracking-[0.12em]",
          isSelf ? "text-[var(--gold-400)]" : "text-[var(--cyan-400)]"
        )}
      >
        {name}
      </p>
      <div
        className="flex h-[18px] w-full overflow-hidden border border-[rgba(186,210,230,0.4)] bg-black"
        title={`NV ${member.level} · Vida ${lifeBoxes}/10 · Maná ${member.mana_current}/${member.mana_max}`}
        aria-label={`Nivel ${member.level}, vida ${Math.round(hpPct)} por ciento, maná ${Math.round(manaPct)} por ciento`}
      >
        <div className="flex aspect-square h-full shrink-0 items-center justify-center border-r border-[rgba(186,210,230,0.4)] font-stat text-[10px] leading-none text-white sm:text-[11px]">
          {member.level}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-[2] gap-px bg-black p-px">
            {Array.from({ length: 10 }, (_, i) => (
              <span
                key={i}
                className="min-w-0 flex-1"
                style={{ backgroundColor: i < lifeBoxes ? hpColor : "#111111" }}
              />
            ))}
          </div>
          <div className="relative min-h-0 flex-1 bg-black">
            <div
              className="absolute inset-y-0 left-0 bg-[var(--cyan-400)] transition-[width] duration-300"
              style={{ width: `${manaPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  active,
  disabled,
  expanded,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      aria-haspopup={expanded === undefined ? undefined : "true"}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-[rgba(5,6,13,0.94)] text-[var(--cyan-400)] shadow-[var(--shadow-glass)]",
        "transition-[border-color,box-shadow,color,background-color,opacity] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
        "hover:border-[var(--stroke-cyan-hot)] hover:text-[var(--cyan-300)] hover:shadow-[var(--glow-cyan)]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-[var(--stroke-cyan)] disabled:hover:shadow-[var(--shadow-glass)] disabled:hover:text-[var(--cyan-400)]",
        active
          ? "border-[var(--stroke-cyan-hot)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
          : "border-[var(--stroke-cyan)]"
      )}
    >
      {children}
    </button>
  );
}

function EmotionWordButton({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-[6px] px-2 py-1 text-left font-display text-[10px] tracking-[0.08em]",
        "text-[var(--text-2)] transition-colors duration-[var(--t-ui)]",
        "hover:bg-[rgba(0,212,255,0.12)] hover:text-[var(--cyan-300)]",
        selected && "bg-[rgba(0,212,255,0.16)] text-[var(--cyan-300)]"
      )}
    >
      {label}
    </button>
  );
}

function AvatarFrame({
  member,
  isSelf = false,
  emotion,
  onEmotionChange,
}: {
  member?: PartyAvatar;
  isSelf?: boolean;
  emotion?: AvatarEmotion | null;
  onEmotionChange?: (emotion: AvatarEmotion | null) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [emotionsOpen, setEmotionsOpen] = useState(false);
  const [failedSrc, setFailedSrc] = useState<Record<string, true>>({});

  if (!member) {
    return (
      <div
        className="aspect-square w-full rounded-[16px] border border-dashed border-[var(--stroke-glass)] bg-[rgba(16,19,31,0.55)]"
        aria-hidden="true"
      />
    );
  }

  const fallbackSrc = crawlerAvatarUrl(member.name, member.portrait_url);
  const emotionSrc = emotion ? crawlerAvatarUrl(member.name, member.portrait_url, emotion) : null;
  const avatarSrc =
    [emotionSrc, fallbackSrc].find((src): src is string => !!src && !failedSrc[src]) ?? null;

  return (
    <div
      className="group relative"
      onMouseLeave={() => setEmotionsOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setEmotionsOpen(false);
      }}
    >
      <MiniVitalBar
        member={member}
        name={isSelf ? "Tu" : avatarBadgeName(member.name)}
        isSelf={isSelf}
      />
      <div className="relative">
        <Link
          href={`/crawler/sheet/${member.id}`}
          aria-label={`ver hoja de ${member.name}`}
          data-party-slot={member.id}
          className="flex cursor-pointer flex-col outline-offset-2"
        >
          <div
            data-party-avatar=""
            className={cn(
              "relative aspect-square w-full rounded-[16px] border-2 bg-[rgba(16,19,31,0.82)] transition-[border-color,box-shadow,filter] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
              isSelf
                ? "border-[var(--gold-400)] shadow-[var(--glow-gold),0_0_18px_rgba(0,212,255,0.35)]"
                : statusRing[member.status],
              !isSelf && "group-hover:border-[var(--stroke-cyan-hot)] group-hover:shadow-[var(--glow-cyan)] group-hover:brightness-110",
              isSelf && "group-hover:brightness-110 group-hover:shadow-[var(--glow-gold),var(--glow-cyan)]"
            )}
          >
            {isSelf && <CornerTicks />}
            <span className="absolute inset-0 overflow-hidden rounded-[14px]">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={avatarSrc}
                  src={avatarSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={() => setFailedSrc((prev) => ({ ...prev, [avatarSrc]: true }))}
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
              {isSelf ? "Tu personaje. " : ""}
              {member.name}, nivel {member.level}.
              {emotion ? ` Emoción: ${AVATAR_EMOTION_LABEL[emotion]}.` : ""}
            </span>
          </div>
        </Link>

        <div
          className={cn(
            "absolute left-full top-1/2 z-[var(--z-drop)] flex -translate-y-1/2 pl-2",
            "opacity-0 transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
            "pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100",
            "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
            emotionsOpen && "pointer-events-auto opacity-100"
          )}
        >
          <div className="flex w-7 flex-col items-start gap-1.5">
            <Link
              href={`/crawler/sheet/${member.id}`}
              aria-label={`Ver perfil de ${member.name}`}
              title="Ver perfil"
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.94)] text-[var(--cyan-400)] shadow-[var(--shadow-glass)]",
                "transition-[border-color,box-shadow,color] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
                "hover:border-[var(--stroke-cyan-hot)] hover:text-[var(--cyan-300)] hover:shadow-[var(--glow-cyan)]"
              )}
            >
              <Eye size={14} />
            </Link>
            {!isSelf && (
              <ActionButton label="Intercambiar (próximamente)" disabled>
                <ArrowLeftRight size={14} />
              </ActionButton>
            )}
            {isSelf && (
              <div
                className="relative h-7 w-7 shrink-0"
                onMouseEnter={() => setEmotionsOpen(true)}
                onMouseLeave={() => setEmotionsOpen(false)}
                onFocusCapture={() => setEmotionsOpen(true)}
              >
                <ActionButton
                  label="Emociones"
                  active={emotionsOpen}
                  expanded={emotionsOpen}
                  onClick={() => setEmotionsOpen(true)}
                >
                  <SmilePlus size={14} />
                </ActionButton>
                <AnimatePresence>
                  {emotionsOpen && (
                    <div className="absolute left-full top-1/2 z-[var(--z-drop)] -translate-y-1/2 pl-2">
                      <motion.div
                        key="emotions"
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 6, scale: 0.98 }}
                        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
                        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 4, scale: 0.98 }}
                        transition={{ duration: reduceMotion ? 0.01 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div
                          role="menu"
                          aria-label="Emociones"
                          className="min-w-[6.5rem] rounded-[10px] border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.94)] p-1 shadow-[var(--shadow-glass)]"
                        >
                          {AVATAR_EMOTIONS.map((key) => (
                            <EmotionWordButton
                              key={key}
                              label={AVATAR_EMOTION_LABEL[key]}
                              selected={emotion === key}
                              onSelect={() => onEmotionChange?.(key)}
                            />
                          ))}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => onEmotionChange?.(null)}
                            className={cn(
                              "mt-0.5 flex w-full items-center gap-1 rounded-[6px] px-2 py-1",
                              "font-display text-[10px] tracking-[0.08em] text-[var(--text-3)]",
                              "transition-colors duration-[var(--t-ui)] hover:bg-[rgba(0,212,255,0.12)] hover:text-[var(--cyan-300)]"
                            )}
                          >
                            <RotateCcw size={10} />
                            Normal
                          </button>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PartyAvatarRail({
  members,
  selfId,
}: {
  members: PartyAvatar[];
  selfId?: string | null;
}) {
  const [emotions, setEmotions] = useState<Partial<Record<string, AvatarEmotion>>>({});

  useEffect(() => {
    setEmotions(readStoredAvatarEmotions());
  }, []);

  const ordered = useMemo(() => {
    if (!selfId) return members;
    const self = members.find((m) => m.id === selfId);
    if (!self) return members;
    return [self, ...members.filter((m) => m.id !== selfId)];
  }, [members, selfId]);
  const slots = Math.max(MIN_SLOTS, ordered.length);

  function setMemberEmotion(id: string, emotion: AvatarEmotion | null) {
    setEmotions((prev) => {
      const next = { ...prev };
      if (emotion) next[id] = emotion;
      else delete next[id];
      writeStoredAvatarEmotions(next);
      return next;
    });
  }

  return (
    <aside
      aria-label="Personajes de la party"
      className="relative z-[var(--z-drop)] flex w-20 shrink-0 flex-col gap-[18px] overflow-visible pt-1 sm:w-24 lg:w-28"
    >
      {Array.from({ length: slots }, (_, i) => {
        const member = ordered[i];
        return (
          <AvatarFrame
            key={member?.id ?? `empty-${i}`}
            member={member}
            isSelf={!!member && member.id === selfId}
            emotion={member && member.id === selfId ? emotions[member.id] ?? null : null}
            onEmotionChange={
              member && member.id === selfId ? (next) => setMemberEmotion(member.id, next) : undefined
            }
          />
        );
      })}
    </aside>
  );
}
