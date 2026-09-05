"use client";

import { cloneElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Resource } from "@/lib/types";
import { RARITY_COLORS } from "@/lib/types";
import { RARITY_LABEL } from "@/lib/copy";
import {
  LOOT_BOX_RARITY_COLORS,
  LOOT_BOX_RARITY_LABEL,
  boxLootFloor,
  boxLootRarity,
  itemIsUnique,
  lootFloorLabel,
  lootOriginLabel,
} from "@/lib/loot";
import { Star } from "lucide-react";
import { resourceThumbUrl } from "@/lib/item-art";
import { resourceDescriptionLabel, resourceKindLabel } from "@/lib/resources";
import { ResourceKindMark } from "@/components/hud/ResourceKindMark";
import { bonusLines, EQUIP_SLOT_LABEL, resourceEquipSlot } from "@/lib/equipment";
import { cn } from "@/lib/utils";

const SHOW_DELAY = 140;
const GAP = 10;
const VIEW_PAD = 8;

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

type TriggerProps = {
  onMouseEnter?: React.MouseEventHandler;
  onMouseLeave?: React.MouseEventHandler;
  onFocusCapture?: React.FocusEventHandler;
  onBlurCapture?: React.FocusEventHandler;
  ref?: React.Ref<HTMLElement>;
};

export function ResourceHoverTip({
  resource,
  disabled,
  children,
}: {
  resource: Resource;
  disabled?: boolean;
  children: React.ReactElement<TriggerProps>;
}) {
  const tipId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 300 });

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
    if (disabled) return;
    clearShow();
    showTimer.current = setTimeout(() => setOpen(true), SHOW_DELAY);
  }, [clearShow, disabled]);

  const updatePos = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const card = cardRef.current?.getBoundingClientRect();
    if (!trigger) return;
    setPos(
      placeCard(trigger, {
        width: card?.width || 300,
        height: card?.height || 240,
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

  const active = !disabled;
  const child = children;

  return (
    <>
      {cloneElement(child, {
        ref: (node: HTMLElement | null) => {
          triggerRef.current = node;
          const prev = child.props.ref;
          if (typeof prev === "function") prev(node);
          else if (prev) prev.current = node;
        },
        onMouseEnter: (e) => {
          child.props.onMouseEnter?.(e);
          if (active) show();
        },
        onMouseLeave: (e) => {
          child.props.onMouseLeave?.(e);
          if (active) hide();
        },
        onFocusCapture: (e) => {
          child.props.onFocusCapture?.(e);
          if (active) show();
        },
        onBlurCapture: (e) => {
          child.props.onBlurCapture?.(e);
          if (active) hide();
        },
      })}
      {mounted && open
        ? createPortal(
            <ResourceTipCard
              id={tipId}
              resource={resource}
              cardRef={cardRef}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              placed={placed}
            />,
            document.body
          )
        : null}
    </>
  );
}

function ResourceTipCard({
  id,
  resource,
  cardRef,
  style,
  placed,
}: {
  id: string;
  resource: Resource;
  cardRef: React.RefObject<HTMLDivElement | null>;
  style: { top: number; left: number; width: number };
  placed: boolean;
}) {
  const description = resourceDescriptionLabel(resource);
  const copy = resource.system_copy?.trim() || "—";
  const slug = resource.slug?.trim();
  const slot = resourceEquipSlot(resource);
  const bonuses = bonusLines(resource);
  const thumb = resourceThumbUrl(resource);

  return (
    <div
      ref={cardRef}
      id={id}
      role="tooltip"
      style={{ top: style.top, left: style.left, width: style.width }}
      className={cn(
        "pointer-events-none fixed z-[var(--z-toast)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.96)] shadow-[var(--shadow-glass)] backdrop-blur-xl",
        placed ? "opacity-100" : "opacity-0"
      )}
    >
      {thumb ? (
        <div className="relative h-28 w-full overflow-hidden bg-[rgba(0,212,255,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thumb} alt="" className="h-full w-full object-contain" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[rgba(5,6,13,0.92)] to-transparent" />
        </div>
      ) : null}
      <div className="space-y-2 px-3 py-3">
        <div className="flex items-start gap-2">
          <ResourceKindMark resource={resource} className="mt-0.5" />
          <p className="font-display text-[15px] leading-tight tracking-wide text-[var(--text-1)]">{resource.name}</p>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-[0.14em]">
          <span className="text-[var(--cyan-400)]">{resourceKindLabel(resource)}</span>
          {resource.kind === "box" ? (
            <>
              {(() => {
                const rarity = boxLootRarity(resource);
                return rarity ? (
                  <span style={{ color: LOOT_BOX_RARITY_COLORS[rarity] }}>{LOOT_BOX_RARITY_LABEL[rarity]}</span>
                ) : null;
              })()}
              <span className="text-[var(--text-3)]">{lootFloorLabel(boxLootFloor(resource))}</span>
            </>
          ) : resource.kind !== "item" ? (
            <span style={{ color: RARITY_COLORS[resource.rarity] }}>{RARITY_LABEL[resource.rarity]}</span>
          ) : null}
          {itemIsUnique(resource) ? (
            <span className="inline-flex items-center gap-1 text-[var(--gold-400)]">
              <Star size={10} fill="currentColor" />
              Único
            </span>
          ) : null}
          {slot ? <span className="text-[var(--text-3)]">Slot · {EQUIP_SLOT_LABEL[slot]}</span> : null}
          {slug ? <span className="text-[var(--text-4)]">{slug}</span> : null}
        </p>
        {lootOriginLabel(resource) ? (
          <p className="text-[10px] text-[var(--text-3)]">{lootOriginLabel(resource)}</p>
        ) : null}
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-4)]">Descripción</p>
          <p className={cn("mt-0.5 text-[12px] leading-relaxed", resource.description?.trim() ? "text-[var(--text-2)]" : "text-[var(--text-4)]")}>
            {description}
          </p>
        </div>
        {bonuses.length > 0 ? (
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-4)]">Bonificadores</p>
            <ul className="mt-0.5 space-y-0.5">
              {bonuses.map((line) => (
                <li key={line} className="text-[12px] leading-snug text-[var(--cyan-300)]">{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div>
          <p className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-4)]">Copy del Sistema</p>
          <p className={cn("mt-0.5 text-[12px] italic leading-relaxed", resource.system_copy?.trim() ? "text-[var(--text-3)]" : "text-[var(--text-4)]")}>
            {copy}
          </p>
        </div>
      </div>
    </div>
  );
}
