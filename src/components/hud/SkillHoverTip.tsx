"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";
import { skillArtUrl } from "@/lib/skill-art";
import type { SkillKind } from "@/lib/types";
import type { SkillTipInfo } from "@/lib/skill-tip";
import { cn } from "@/lib/utils";

const SHOW_DELAY = 140;
const GAP = 10;
const VIEW_PAD = 8;

const KIND_TONE: Record<SkillKind, string> = {
  ataque: "text-[var(--orange-400)]",
  defensa: "text-[var(--cyan-400)]",
  apoyo: "text-[var(--gold-400)]",
  destreza: "text-[var(--magenta-400)]",
};

function placeCard(trigger: DOMRect, card: { width: number; height: number }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(card.width, vw - VIEW_PAD * 2);
  const height = Math.min(card.height, vh - VIEW_PAD * 2);

  let left = trigger.right + GAP;
  if (left + width > vw - VIEW_PAD) left = trigger.left - GAP - width;
  if (left < VIEW_PAD) left = Math.max(VIEW_PAD, (vw - width) / 2);

  let top = trigger.top + trigger.height / 2 - height / 2;
  if (top + height > vh - VIEW_PAD) top = vh - VIEW_PAD - height;
  if (top < VIEW_PAD) top = VIEW_PAD;

  const roomAbove = trigger.top - VIEW_PAD;
  const roomBelow = vh - trigger.bottom - VIEW_PAD;
  if (left < trigger.left && left + width > trigger.right) {
    if (roomAbove >= height + GAP || roomAbove >= roomBelow) {
      top = trigger.top - GAP - height;
      if (top < VIEW_PAD) top = VIEW_PAD;
    } else {
      top = trigger.bottom + GAP;
      if (top + height > vh - VIEW_PAD) top = vh - VIEW_PAD - height;
    }
    left = Math.min(Math.max(VIEW_PAD, trigger.left + trigger.width / 2 - width / 2), vw - VIEW_PAD - width);
  }

  return { top, left, width };
}

export function SkillHoverTip({
  info,
  disabled,
  className,
  children,
}: {
  info?: SkillTipInfo | null;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const tipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 264 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearShow = useCallback(() => {
    if (showTimer.current != null) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearShow();
    setOpen(false);
    setPlaced(false);
  }, [clearShow]);

  const show = useCallback(() => {
    if (!info || disabled) return;
    clearShow();
    showTimer.current = setTimeout(() => setOpen(true), SHOW_DELAY);
  }, [clearShow, disabled, info]);

  const updatePos = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const card = cardRef.current?.getBoundingClientRect();
    if (!trigger) return;
    setPos(
      placeCard(trigger, {
        width: card?.width || 264,
        height: card?.height || 320,
      })
    );
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPlaced(false);
      return;
    }
    updatePos();
    setPlaced(true);
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    function onScrollOrResize() {
      updatePos();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") hide();
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [hide, open, updatePos]);

  useEffect(() => () => clearShow(), [clearShow]);

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  const active = Boolean(info) && !disabled;

  return (
    <span
      ref={triggerRef}
      className={cn("inline-flex", className)}
      onMouseEnter={active ? show : undefined}
      onMouseLeave={active ? hide : undefined}
      onFocusCapture={active ? show : undefined}
      onBlurCapture={active ? hide : undefined}
      aria-describedby={open && info ? tipId : undefined}
    >
      {children}
      {mounted && open && info
        ? createPortal(
            <SkillTipCard
              id={tipId}
              info={info}
              cardRef={cardRef}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              placed={placed}
            />,
            document.body
          )
        : null}
    </span>
  );
}

function SkillTipCard({
  id,
  info,
  cardRef,
  style,
  placed,
}: {
  id: string;
  info: SkillTipInfo;
  cardRef: React.RefObject<HTMLDivElement | null>;
  style: { top: number; left: number; width: number };
  placed: boolean;
}) {
  const src = skillArtUrl(info.slug, info.skillType, info.thumbUrl);
  const [failed, setFailed] = useState(!src);
  useEffect(() => {
    setFailed(!src);
  }, [src]);
  const ready = Boolean(src && !failed);
  const typeTone = info.kind ? KIND_TONE[info.kind] : "text-[var(--magenta-400)]";
  const rank = info.rank != null && Number.isFinite(info.rank) ? info.rank : null;

  return (
    <div
      ref={cardRef}
      id={id}
      role="tooltip"
      style={{ top: style.top, left: style.left, width: style.width }}
      className={cn(
        "pointer-events-none fixed z-[var(--z-toast)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-[var(--stroke-magenta)] bg-[rgba(5,6,13,0.96)] shadow-[var(--shadow-glass)] backdrop-blur-xl",
        placed ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="relative aspect-square max-h-[min(16.5rem,42vh)] w-full overflow-hidden bg-[rgba(232,121,249,0.08)]">
        {ready && src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Sparkles size={42} strokeWidth={1.4} className="text-[var(--magenta-400)] opacity-45" />
          </span>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(5,6,13,0.92)] to-transparent" />
      </div>
      <div className="space-y-1.5 px-3 pb-3 pt-2">
        <p className="font-display text-[15px] leading-tight tracking-wide text-[var(--text-1)]">{info.name}</p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-[0.14em]">
          {rank != null ? <span className="font-stat text-[var(--gold-400)]">Rango {rank}</span> : null}
          {info.rollLabel ? (
            <span className="text-[var(--cyan-400)]">{rank != null ? `d100 ${info.rollLabel}` : `Rango ${info.rollLabel}`}</span>
          ) : null}
          <span className={typeTone}>{info.typeLabel}</span>
          {info.animalOnly ? <span className="text-[var(--text-4)]">Solo animal</span> : null}
        </p>
        {info.description ? (
          <p className="text-[12px] leading-relaxed text-[var(--text-2)]">{info.description}</p>
        ) : (
          <p className="text-[11px] text-[var(--text-4)]">Sin descripción todavía.</p>
        )}
      </div>
    </div>
  );
}
