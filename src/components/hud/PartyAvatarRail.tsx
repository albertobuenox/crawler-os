"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, Eye, RotateCcw, SmilePlus } from "lucide-react";
import type { CrawlerStatus } from "@/lib/types";
import {
  AVATAR_EMOTION_LABEL,
  AVATAR_EMOTIONS,
  crawlerAvatarUrl,
  crawlerInitials,
  parseAvatarEmotion,
  type AvatarEmotion,
} from "@/lib/crawler-art";
import { crawlerClassLabel, crawlerIdentityLine, crawlerRaceLabel } from "@/lib/copy";
import { clampLifeBoxes, clampMana, healthBarColor, healthPercent, MANA_BAR_COLOR, manaPercent } from "@/lib/rules";
import { cn } from "@/lib/utils";

export type PartyAvatar = {
  id: string;
  name: string;
  portrait_url: string | null;
  status: CrawlerStatus;
  level: number;
  race: string | null;
  class_name: string | null;
  hp_boxes_filled: number;
  mana_current: number;
  mana_max: number;
  avatar_emotion: AvatarEmotion | null;
};

export function toPartyAvatar(row: {
  id: string;
  name: string;
  portrait_url?: string | null;
  status: CrawlerStatus;
  level: number;
  race?: string | null;
  class_name?: string | null;
  hp_boxes_filled: number;
  mana_current: number;
  mana_max: number;
  avatar_emotion?: string | null;
}): PartyAvatar {
  return {
    id: row.id,
    name: row.name,
    portrait_url: row.portrait_url ?? null,
    status: row.status,
    level: row.level,
    race: row.race ?? null,
    class_name: row.class_name ?? null,
    hp_boxes_filled: row.hp_boxes_filled,
    mana_current: row.mana_current,
    mana_max: row.mana_max,
    avatar_emotion: parseAvatarEmotion(row.avatar_emotion),
  };
}

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
  sheetHref,
  onOpenSheet,
  onLifeChange,
  onManaChange,
}: {
  member: PartyAvatar;
  name: string;
  isSelf: boolean;
  sheetHref?: string;
  onOpenSheet?: (id: string) => void;
  onLifeChange?: (lifeBoxes: number) => void;
  onManaChange?: (manaCurrent: number) => void;
}) {
  const hpFilled = Math.min(Math.max(member.hp_boxes_filled, 0), 10);
  const lifeBoxes = 10 - hpFilled;
  const hpPct = healthPercent(hpFilled);
  const hpColor = healthBarColor(lifeBoxes);
  const manaMax = Math.max(member.mana_max, 0);
  const manaNow = clampMana(member.mana_current, manaMax);
  const manaPct = manaPercent(manaNow, manaMax);

  function setLife(index: number) {
    if (!onLifeChange) return;
    const clickedRemaining = index + 1;
    onLifeChange(clampLifeBoxes(clickedRemaining === lifeBoxes ? lifeBoxes - 1 : clickedRemaining));
  }

  function setManaFromPointer(el: HTMLElement, clientX: number) {
    if (!onManaChange) return;
    const rect = el.getBoundingClientRect();
    const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
    onManaChange(clampMana(ratio * manaMax, manaMax));
  }

  return (
    <div className="mb-1 w-full">
      <Link
        href={sheetHref ?? `/crawler/sheet/${member.id}`}
        onClick={
          onOpenSheet
            ? (e) => {
                e.preventDefault();
                onOpenSheet(member.id);
              }
            : undefined
        }
        className="mb-0.5 block rounded-sm text-center outline-offset-2"
        aria-label={`${name} — ir a la hoja de personaje`}
      >
        <p
          className={cn(
            "truncate font-display text-[8px] tracking-[0.12em]",
            isSelf ? "text-[var(--gold-400)]" : "text-[var(--cyan-400)]"
          )}
        >
          {name}
        </p>
        <p className="font-stat text-[8px] leading-tight text-[var(--text-2)]">Nv {member.level}</p>
        <p className="truncate font-display text-[7px] leading-tight tracking-wide text-[var(--text-4)]">
          {crawlerRaceLabel(member.race)} · {crawlerClassLabel(member.class_name)}
        </p>
      </Link>
      <div
        className="flex h-[18px] w-full overflow-hidden border border-[rgba(186,210,230,0.4)] bg-black"
        title={`NV ${member.level} · Vida ${lifeBoxes}/10 · Maná ${manaNow}/${manaMax} · ${Math.round(manaPct)}%`}
        aria-label={`Nivel ${member.level}, vida ${Math.round(hpPct)} por ciento, maná ${Math.round(manaPct)} por ciento`}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-[2] gap-px bg-black p-px">
            {Array.from({ length: 10 }, (_, i) => {
              const filled = i < lifeBoxes;
              if (onLifeChange) {
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${filled ? "Vida" : "Vacía"} ${i + 1} de 10`}
                    onClick={() => setLife(i)}
                    className="min-w-0 flex-1"
                    style={{ backgroundColor: filled ? hpColor : "#111111" }}
                  />
                );
              }
              return (
                <span
                  key={i}
                  className="min-w-0 flex-1"
                  style={{ backgroundColor: filled ? hpColor : "#111111" }}
                />
              );
            })}
          </div>
          <div
            role={onManaChange ? "slider" : undefined}
            aria-label="Maná"
            aria-valuemin={onManaChange ? 0 : undefined}
            aria-valuemax={onManaChange ? manaMax : undefined}
            aria-valuenow={onManaChange ? manaNow : undefined}
            tabIndex={onManaChange ? 0 : undefined}
            onClick={onManaChange ? (e) => setManaFromPointer(e.currentTarget, e.clientX) : undefined}
            onKeyDown={
              onManaChange
                ? (e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                      e.preventDefault();
                      onManaChange(clampMana(manaNow - 1, manaMax));
                    }
                    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                      e.preventDefault();
                      onManaChange(clampMana(manaNow + 1, manaMax));
                    }
                  }
                : undefined
            }
            className={cn("relative min-h-0 flex-1 bg-black", onManaChange && "cursor-pointer")}
          >
            <div
              className="absolute inset-y-0 left-0 transition-[width,background-color] duration-300"
              style={{
                width: `${manaPct}%`,
                backgroundColor: MANA_BAR_COLOR,
                boxShadow: manaPct > 0 ? `0 0 8px ${MANA_BAR_COLOR}` : undefined,
              }}
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
  choosing = false,
  dimmed = false,
  onOpenSheet,
  onEmotionChange,
  onLifeChange,
  onManaChange,
}: {
  member?: PartyAvatar;
  isSelf?: boolean;
  emotion?: AvatarEmotion | null;
  choosing?: boolean;
  dimmed?: boolean;
  onOpenSheet?: (id: string) => void;
  onEmotionChange?: (emotion: AvatarEmotion | null) => void;
  onLifeChange?: (lifeBoxes: number) => void;
  onManaChange?: (manaCurrent: number) => void;
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
      className={cn("group relative", dimmed && "pointer-events-none opacity-25")}
      onMouseLeave={() => setEmotionsOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setEmotionsOpen(false);
      }}
    >
      <MiniVitalBar
        member={member}
        name={isSelf ? "Tu" : avatarBadgeName(member.name)}
        isSelf={isSelf}
        onOpenSheet={onOpenSheet}
        onLifeChange={isSelf ? onLifeChange : undefined}
        onManaChange={isSelf ? onManaChange : undefined}
      />
      <div className="relative">
        <Link
          href={`/crawler/sheet/${member.id}`}
          onClick={
            onOpenSheet
              ? (e) => {
                  e.preventDefault();
                  onOpenSheet(member.id);
                }
              : undefined
          }
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
              isSelf && "group-hover:brightness-110 group-hover:shadow-[var(--glow-gold),var(--glow-cyan)]",
              choosing && "border-[var(--cyan-400)] shadow-[0_0_22px_rgba(34,240,255,0.75),var(--glow-cyan)]"
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
              {member.name}, {crawlerIdentityLine(member)}.
              {emotion ? ` Emoción: ${AVATAR_EMOTION_LABEL[emotion]}.` : ""}
            </span>
          </div>
        </Link>

        {choosing && (
          <div className="pointer-events-none absolute left-full top-1/2 z-[1] ml-3 w-max max-w-[14rem] -translate-y-1/2">
            <div className="rounded-[12px] border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.9)] px-3 py-2 shadow-[var(--glow-cyan)] backdrop-blur-md">
              <p className="font-display text-[11px] tracking-[0.12em] text-[var(--cyan-300)]">
                {member.name}
              </p>
              <p className="text-[11px] leading-snug text-[var(--text-2)]">
                está eligiendo dado
              </p>
            </div>
          </div>
        )}

        <div
          className={cn(
            "absolute left-full top-1/2 z-[var(--z-drop)] flex -translate-y-1/2 pl-2",
            "opacity-0 transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
            "pointer-events-none group-hover:pointer-events-auto group-hover:opacity-100",
            "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
            emotionsOpen && "pointer-events-auto opacity-100",
            choosing && "hidden"
          )}
        >
          <div className="flex w-7 flex-col items-start gap-1.5">
            <Link
              href={`/crawler/sheet/${member.id}`}
              onClick={
                onOpenSheet
                  ? (e) => {
                      e.preventDefault();
                      onOpenSheet(member.id);
                    }
                  : undefined
              }
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
  choosingId,
  onOpenSheet,
  onSelfLifeChange,
  onSelfManaChange,
  onSelfEmotionChange,
}: {
  members: PartyAvatar[];
  selfId?: string | null;
  choosingId?: string | null;
  onOpenSheet?: (id: string) => void;
  onSelfLifeChange?: (lifeBoxes: number) => void;
  onSelfManaChange?: (manaCurrent: number) => void;
  onSelfEmotionChange?: (emotion: AvatarEmotion | null) => void;
}) {
  const ordered = useMemo(() => {
    if (!selfId) return members;
    const self = members.find((m) => m.id === selfId);
    if (!self) return members;
    return [self, ...members.filter((m) => m.id !== selfId)];
  }, [members, selfId]);
  const slots = Math.max(MIN_SLOTS, ordered.length);

  return (
    <aside
      aria-label="Personajes de la party"
      className={cn(
        "relative flex w-24 shrink-0 flex-col gap-[18px] overflow-visible pt-1 sm:w-28 lg:w-32",
        choosingId ? "z-[47]" : "z-[var(--z-drop)]"
      )}
    >
      {Array.from({ length: slots }, (_, i) => {
        const member = ordered[i];
        const isSelf = !!member && member.id === selfId;
        const choosing = !!member && member.id === choosingId;
        return (
          <AvatarFrame
            key={member?.id ?? `empty-${i}`}
            member={member}
            isSelf={isSelf}
            emotion={member?.avatar_emotion ?? null}
            choosing={choosing}
            dimmed={!!choosingId && !choosing}
            onOpenSheet={onOpenSheet}
            onEmotionChange={isSelf ? onSelfEmotionChange : undefined}
            onLifeChange={isSelf ? onSelfLifeChange : undefined}
            onManaChange={isSelf ? onSelfManaChange : undefined}
          />
        );
      })}
    </aside>
  );
}
