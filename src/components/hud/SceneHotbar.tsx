"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, GripHorizontal, Locate, Minus, Plus, Scaling, Sparkles, Star, Sword, Trash2, Wand, Wrench, X, Zap, ZoomIn, ZoomOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  clampHotbarScale,
  emptyHotbar,
  formatHotbarQty,
  hydrateHotbar,
  HOTBAR_KEYS,
  HOTBAR_SCALE_DEFAULT,
  HOTBAR_SCALE_MAX,
  HOTBAR_SCALE_MIN,
  HOTBAR_SCALE_STEP,
  HOTBAR_SIZE,
  keyToSlotIndex,
  readHotbar,
  readHotbarChrome,
  writeHotbar,
  writeHotbarChrome,
  type HotbarEntry,
  type HotbarSlots,
} from "@/lib/hotbar";
import type { ItemInstance, Resource, Skill } from "@/lib/types";
import { SKILL_KIND_LABEL, SKILL_TYPE_LABEL } from "@/lib/copy";
import { resourceBlurb } from "@/lib/resources";
import { itemIsUnique } from "@/lib/loot";
import { skillArtSlug } from "@/lib/skill-art";
import { isSkillChecked } from "@/lib/skills";
import { SkillHoverTip } from "@/components/hud/SkillHoverTip";
import { SkillThumb, useSkillArt } from "@/components/hud/SkillThumb";
import { tipFromSkill } from "@/lib/skill-tip";
import { HotbarDiceTray } from "@/components/hud/HotbarDiceTray";
import type { SceneDieSides } from "@/lib/scene-dice";
import { cn } from "@/lib/utils";

type SheetItem = ItemInstance & { resource: Resource };

const skillIcon = {
  attack: Sword,
  spell: Wand,
  utility: Wrench,
  passive: Sparkles,
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;
const SNAP = { duration: 0.2, ease: EASE };
const FOLD = { type: "spring" as const, stiffness: 360, damping: 34, mass: 0.72 };

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function slotEquals(a: HotbarEntry | null, b: HotbarEntry) {
  return !!a && a.kind === b.kind && a.id === b.id;
}

function itemDescription(item: SheetItem): string {
  return resourceBlurb(item.resource, [item.notes]);
}

function ChromeButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex h-5 w-5 items-center justify-center rounded-[4px] text-[var(--hotbar-pink)] transition-colors duration-[var(--t-ui)] hover:bg-[rgba(255,45,106,0.16)] hover:text-[var(--hotbar)]"
    >
      {children}
    </button>
  );
}

export function SceneHotbar({
  crawlerId,
  skills,
  items,
  lifted = false,
  diceLocked = false,
  readOnly = false,
  onDiceOpenChange,
  onDiePicked,
}: {
  crawlerId: string;
  skills: Skill[];
  items: SheetItem[];
  lifted?: boolean;
  diceLocked?: boolean;
  readOnly?: boolean;
  onDiceOpenChange?: (open: boolean) => void;
  onDiePicked?: (sides: SceneDieSides) => void;
}) {
  const supabase = createClient();
  const reduceMotion = useReducedMotion();
  const motionSnap = reduceMotion ? { duration: 0.01 } : SNAP;
  const motionFold = reduceMotion ? { duration: 0.01 } : FOLD;
  const [slots, setSlots] = useState<HotbarSlots>(emptyHotbar);
  const [assignIndex, setAssignIndex] = useState<number | null>(null);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [movingIndex, setMovingIndex] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [scaling, setScaling] = useState(false);
  const [scale, setScale] = useState(HOTBAR_SCALE_DEFAULT);
  const [diceOpen, setDiceOpen] = useState(false);
  const [slotBox, setSlotBox] = useState({ width: 0, height: 0 });
  const boundsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const slotsMeasureRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const minimizedRef = useRef(minimized);
  minimizedRef.current = minimized;
  const diceOpenRef = useRef(diceOpen);
  diceOpenRef.current = diceOpen;
  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const scaleDragRef = useRef({
    active: false,
    startX: 0,
    startWidth: 1,
    originScale: HOTBAR_SCALE_DEFAULT,
  });

  const activeSkills = useMemo(
    () => skills.filter((s) => s.skill_type !== "passive"),
    [skills]
  );
  const consumables = useMemo(
    () => items.filter((i) => i.resource.kind === "item" && i.quantity > 0),
    [items]
  );

  useEffect(() => {
    const chrome = readHotbarChrome(crawlerId);
    setOffset({ x: chrome.offsetX, y: chrome.offsetY });
    setMinimized(chrome.minimized);
    setScale(chrome.scale);
    setDiceOpen(false);
  }, [crawlerId]);

  useEffect(() => {
    const next = hydrateHotbar(readHotbar(crawlerId), items).map((slot) => {
      if (!slot) return null;
      if (slot.kind === "skill" && !skills.some((s) => s.id === slot.id)) return null;
      if (slot.kind === "item" && !items.some((i) => i.id === slot.id)) return null;
      return slot;
    }) as HotbarSlots;
    setSlots(next);
    if (!readOnly) writeHotbar(crawlerId, next);
  }, [crawlerId, items, readOnly, skills]);

  useLayoutEffect(() => {
    const el = slotsMeasureRef.current;
    if (!el) return;
    const update = () => {
      setSlotBox({ width: el.offsetWidth, height: el.offsetHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [slots, scale]);

  const persistChrome = useCallback(
    (
      next: { x: number; y: number },
      mini: boolean,
      nextScale = scaleRef.current,
      nextDice = diceOpenRef.current
    ) => {
      if (readOnly) return;
      writeHotbarChrome(crawlerId, {
        offsetX: next.x,
        offsetY: next.y,
        minimized: mini,
        scale: clampHotbarScale(nextScale),
        diceOpen: nextDice,
      });
    },
    [crawlerId, readOnly]
  );

  const clampOffset = useCallback((x: number, y: number) => {
    const parent = boundsRef.current;
    const bar = barRef.current;
    if (!parent || !bar) return { x, y };
    const pr = parent.getBoundingClientRect();
    const bw = bar.offsetWidth;
    const bh = bar.offsetHeight;
    const defaultLeft = (pr.width - bw) / 2;
    const defaultTop = pr.height - bh - 8;
    const left = Math.min(Math.max(0, defaultLeft + x), Math.max(0, pr.width - bw));
    const top = Math.min(Math.max(0, defaultTop + y), Math.max(0, pr.height - bh));
    return { x: left - defaultLeft, y: top - defaultTop };
  }, []);

  useLayoutEffect(() => {
    setOffset((current) => clampOffset(current.x, current.y));
  }, [clampOffset, minimized, scale]);

  useEffect(() => {
    if (!scaling) return;
    const previous = document.body.style.cursor;
    document.body.style.cursor = "nwse-resize";
    return () => {
      document.body.style.cursor = previous;
    };
  }, [scaling]);

  const persist = useCallback(
    async (next: HotbarSlots) => {
      setSlots(next);
      if (readOnly) return;
      writeHotbar(crawlerId, next);
      const occupied = new Map<string, number>();
      next.forEach((entry, i) => {
        if (entry?.kind === "item") occupied.set(entry.id, i);
      });
      await Promise.all(
        items.map((item) => {
          const index = occupied.get(item.id) ?? null;
          if (item.hotlist_index === index) return Promise.resolve();
          return supabase.from("item_instances").update({ hotlist_index: index }).eq("id", item.id);
        })
      );
    },
    [crawlerId, items, readOnly, supabase]
  );

  const assign = useCallback(
    (index: number, entry: HotbarEntry) => {
      if (readOnly) return;
      const next = slots.map((slot, i) => {
        if (slotEquals(slot, entry)) return null;
        if (i === index) return entry;
        return slot;
      }) as HotbarSlots;
      void persist(next);
      setAssignIndex(null);
      setSelectedIndex(index);
    },
    [persist, readOnly, slots]
  );

  const clearSlot = useCallback(
    (index: number) => {
      const next = slots.slice() as HotbarSlots;
      next[index] = null;
      void persist(next);
      setSelectedIndex((sel) => (sel === index ? null : sel));
    },
    [persist, slots]
  );

  const moveSlot = useCallback(
    (from: number, to: number) => {
      if (from === to) {
        setMovingIndex(null);
        return;
      }
      const next = slots.slice() as HotbarSlots;
      const held = next[from];
      next[from] = next[to];
      next[to] = held;
      void persist(next);
      setMovingIndex(null);
      setMenuIndex(null);
      setSelectedIndex((sel) => {
        if (sel === from) return to;
        if (sel === to) return from;
        return sel;
      });
    },
    [persist, slots]
  );

  const activate = useCallback(
    (index: number) => {
      if (readOnly) return;
      const entry = slots[index];
      if (movingIndex != null) {
        moveSlot(movingIndex, index);
        return;
      }
      if (!entry) {
        setMinimized(false);
        persistChrome(offset, false);
        setMenuIndex(null);
        setAssignIndex(index);
        return;
      }
      setMenuIndex(null);
      setSelectedIndex(index);
      setPressed(index);
      window.setTimeout(() => setPressed((current) => (current === index ? null : current)), 180);
      if (entry.kind === "skill") {
        void supabase.rpc("mark_skill_used", { p_skill_id: entry.id });
      }
    },
    [moveSlot, movingIndex, offset, persistChrome, readOnly, slots, supabase]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "Escape") {
        setAssignIndex(null);
        setMenuIndex(null);
        setMovingIndex(null);
        return;
      }
      const index = keyToSlotIndex(event.key);
      if (index == null) return;
      event.preventDefault();
      activate(index);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activate]);

  useEffect(() => {
    if (assignIndex == null && menuIndex == null && movingIndex == null) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-hotbar-root]")) return;
      setAssignIndex(null);
      setMenuIndex(null);
      setMovingIndex(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [assignIndex, menuIndex, movingIndex]);

  function onDragPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setDragging(true);
  }

  function onDragPointerMove(event: React.PointerEvent) {
    if (!dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    setOffset(clampOffset(dragRef.current.originX + dx, dragRef.current.originY + dy));
  }

  function onDragPointerUp() {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    setOffset((current) => {
      const next = clampOffset(current.x, current.y);
      persistChrome(next, minimized);
      return next;
    });
  }

  function resetPosition() {
    setOffset({ x: 0, y: 0 });
    persistChrome({ x: 0, y: 0 }, minimized);
  }

  function onScalePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const measured = slotsMeasureRef.current?.offsetWidth ?? barRef.current?.offsetWidth;
    scaleDragRef.current = {
      active: true,
      startX: event.clientX,
      startWidth: Math.max(1, measured ?? 1),
      originScale: scaleRef.current,
    };
    setScaling(true);

    function onMove(moveEvent: PointerEvent) {
      if (!scaleDragRef.current.active) return;
      const { startX, startWidth, originScale } = scaleDragRef.current;
      const dx = moveEvent.clientX - startX;
      setScale(clampHotbarScale(originScale * ((startWidth + dx * 2) / startWidth)));
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (!scaleDragRef.current.active) return;
      scaleDragRef.current.active = false;
      setScaling(false);
      setOffset((current) => {
        const next = clampOffset(current.x, current.y);
        persistChrome(next, minimizedRef.current, scaleRef.current);
        return next;
      });
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function stepScale(delta: number) {
    const next = clampHotbarScale(scaleRef.current + delta);
    if (next === scaleRef.current) return;
    setScale(next);
    persistChrome(offset, minimized, next);
  }

  function onScaleKeyDown(event: React.KeyboardEvent) {
    const step = event.shiftKey ? HOTBAR_SCALE_STEP * 2 : HOTBAR_SCALE_STEP;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      stepScale(step);
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      stepScale(-step);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setScale(HOTBAR_SCALE_MIN);
      persistChrome(offset, minimized, HOTBAR_SCALE_MIN);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setScale(HOTBAR_SCALE_MAX);
      persistChrome(offset, minimized, HOTBAR_SCALE_MAX);
    }
  }

  function toggleMinimized() {
    const next = !minimized;
    setMinimized(next);
    setAssignIndex(null);
    setMenuIndex(null);
    setMovingIndex(null);
    persistChrome(offset, next);
  }

  function toggleDiceOpen() {
    if (readOnly || (diceLocked && !diceOpen)) return;
    const next = !diceOpen;
    setDiceOpen(next);
    persistChrome(offset, minimized, scaleRef.current, next);
    onDiceOpenChange?.(next);
  }

  const assigningKey = assignIndex != null ? HOTBAR_KEYS[assignIndex] : null;
  const atHome = offset.x === 0 && offset.y === 0;

  return (
    <div
      ref={boundsRef}
      data-hotbar-root=""
      className={cn(
        "pointer-events-none absolute inset-0 overflow-visible",
        lifted ? "z-[48]" : "z-[var(--z-overlay)]"
      )}
    >
      <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2">
        <motion.div
          ref={barRef}
          animate={{ x: offset.x, y: offset.y }}
          transition={dragging || scaling ? { duration: 0 } : motionSnap}
        >
        <div className="flex flex-col items-center">
          <AnimatePresence initial={false}>
            {assignIndex != null && !minimized && (
              <motion.div
                key="assign"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={motionSnap}
                role="dialog"
                aria-label={`Asignar al hueco ${assigningKey}`}
                className="mb-1.5 max-h-[min(36vh,240px)] w-[min(100%,18rem)] overflow-y-auto rounded-[12px] border border-[var(--stroke-hotbar)] bg-[rgba(12,4,10,0.94)] p-2 shadow-[var(--glow-hotbar)] backdrop-blur-md"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="font-display text-[10px] tracking-[0.16em] text-[var(--hotbar-pink)]">
                    Hueco {assigningKey}
                  </p>
                  <button
                    type="button"
                    aria-label="Cerrar"
                    onClick={() => setAssignIndex(null)}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--hotbar-pink)] hover:bg-[rgba(255,45,106,0.12)]"
                  >
                    <X size={12} />
                  </button>
                </div>
                <p className="px-1 text-[10px] uppercase tracking-[0.14em] text-[var(--hp-soft)]">Habilidades</p>
                {activeSkills.length === 0 ? (
                  <p className="px-1 py-1 text-[11px] text-[var(--text-4)]">Ninguna activable.</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {activeSkills.map((skill) => (
                      <li key={skill.id}>
                        <button
                          type="button"
                          onClick={() => assign(assignIndex, { kind: "skill", id: skill.id })}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--text-1)] hover:bg-[rgba(255,45,106,0.14)]"
                        >
                          <SkillThumb slug={skillArtSlug(skill)} skillType={skill.skill_type} thumbUrl={skill.skill_catalog?.thumb_url} size="xs" className="border-[var(--stroke-hotbar)] bg-[rgba(255,45,106,0.1)]" tip={skill} />
                          <span className="min-w-0 truncate">{skill.name}</span>
                          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-[var(--hp-soft)]">
                            {skill.skill_catalog?.kind
                              ? SKILL_KIND_LABEL[skill.skill_catalog.kind]
                              : SKILL_TYPE_LABEL[skill.skill_type] ?? skill.skill_type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 px-1 text-[10px] uppercase tracking-[0.14em] text-[var(--hp-soft)]">Consumibles</p>
                {consumables.length === 0 ? (
                  <p className="px-1 py-1 text-[11px] text-[var(--text-4)]">Ningún objeto.</p>
                ) : (
                  <ul className="mt-1 space-y-0.5">
                    {consumables.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => assign(assignIndex, { kind: "item", id: item.id })}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-[var(--text-1)] hover:bg-[rgba(255,45,106,0.14)]"
                        >
                          <span className="relative shrink-0">
                            {item.resource.icon_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.resource.icon_url} alt="" className="h-5 w-5 object-contain" />
                            ) : (
                              <Sparkles size={14} className="text-[var(--hotbar)]" />
                            )}
                            {itemIsUnique(item.resource) ? (
                              <Star size={8} className="absolute -right-1 -top-1 text-[var(--gold-400)]" fill="currentColor" />
                            ) : null}
                          </span>
                          <span className="min-w-0 truncate">{item.resource.name}</span>
                          <span className="ml-auto font-stat text-[11px] text-[var(--hotbar)]">
                            {formatHotbarQty(item.quantity)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {slots[assignIndex] && (
                  <button
                    type="button"
                    onClick={() => {
                      clearSlot(assignIndex);
                      setAssignIndex(null);
                    }}
                    className="mt-2 w-full rounded-lg border border-[var(--stroke-hotbar)] px-2 py-1.5 text-[11px] text-[var(--hotbar-pink)] hover:bg-[rgba(255,45,106,0.12)]"
                  >
                    Vaciar hueco
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {movingIndex != null && !minimized && (
            <p className="mb-1 font-display text-[9px] tracking-[0.16em] text-[var(--hotbar-pink)]">
              Elige un hueco
            </p>
          )}

          <div
            className="relative"
            style={{
              ["--hotbar-scale" as string]: String(scale),
              paddingTop: "calc(1.55rem * var(--hotbar-scale, 1.9))",
            }}
          >
            <HotbarDiceTray
              open={diceOpen}
              onToggle={toggleDiceOpen}
              locked={diceLocked}
              onPick={
                onDiePicked
                  ? (sides) => {
                      setDiceOpen(false);
                      persistChrome(offset, minimized, scaleRef.current, false);
                      onDiePicked(sides);
                    }
                  : undefined
              }
            />
            <div
              className={cn(
                "relative rounded-[10px] border border-[var(--stroke-hotbar)] bg-[var(--hotbar-fill)] px-1.5 py-1 shadow-[var(--glow-hotbar)] backdrop-blur-md",
                !minimized && "pr-6",
                lifted && "pointer-events-none opacity-35"
              )}
            >
            <div
              className="flex cursor-grab select-none items-center gap-1 active:cursor-grabbing"
              onPointerDown={onDragPointerDown}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerUp}
              onPointerCancel={onDragPointerUp}
            >
              <GripHorizontal size={12} className="ml-0.5 text-[var(--hotbar)] opacity-70" />
              <span className="min-w-2 flex-1" />
              <ChromeButton
                label={atHome ? "En el origen" : "Volver al origen"}
                onClick={resetPosition}
              >
                <Locate size={11} />
              </ChromeButton>
              {minimized ? (
                <button
                  type="button"
                  aria-label="Maximizar hotbar"
                  title="Maximizar"
                  onClick={toggleMinimized}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--stroke-hotbar)] bg-[rgba(255,45,106,0.18)] text-[var(--hotbar-pink)] transition-colors duration-[var(--t-ui)] hover:bg-[rgba(255,45,106,0.32)] hover:text-[var(--hotbar)]"
                >
                  <Plus size={15} strokeWidth={2.75} />
                </button>
              ) : (
                <ChromeButton label="Minimizar hotbar" onClick={toggleMinimized}>
                  <Minus size={12} />
                </ChromeButton>
              )}
            </div>
            <motion.div
              initial={false}
              animate={
                slotBox.height > 0
                  ? {
                      height: minimized ? 0 : slotBox.height,
                      opacity: minimized ? 0 : 1,
                      marginTop: minimized ? 0 : 4,
                    }
                  : undefined
              }
              transition={scaling || dragging ? { duration: 0 } : motionFold}
              className="overflow-hidden"
              style={{ originY: 0 }}
            >
              <div ref={slotsMeasureRef} className="w-max">
                <div
                  role="toolbar"
                  aria-label="Hotbar. Teclas 1 a 0."
                  className="flex items-end"
                  style={{ gap: "calc(0.125rem * var(--hotbar-scale, 1.9))" }}
                >
                  {Array.from({ length: HOTBAR_SIZE }, (_, i) => (
                    <HotbarSlot
                      key={i}
                      index={i}
                      entry={slots[i]}
                      skill={slots[i]?.kind === "skill" ? skills.find((s) => s.id === slots[i]?.id) : undefined}
                      item={slots[i]?.kind === "item" ? items.find((it) => it.id === slots[i]?.id) : undefined}
                      pressed={pressed === i}
                      selected={selectedIndex === i}
                      assigning={assignIndex === i}
                      menuOpen={menuIndex === i}
                      moving={movingIndex === i}
                      moveTarget={movingIndex != null && movingIndex !== i}
                      onActivate={() => activate(i)}
                      onAssign={() => {
                        setMenuIndex(null);
                        setAssignIndex((current) => (current === i ? null : i));
                      }}
                      onOpenMenu={() => {
                        setAssignIndex(null);
                        setMovingIndex(null);
                        setMenuIndex(i);
                      }}
                      onUse={() => activate(i)}
                      onMove={() => {
                        setMenuIndex(null);
                        setMovingIndex(i);
                      }}
                      onClear={() => {
                        clearSlot(i);
                        setMenuIndex(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
            {!minimized && (
              <ScaleCorner
                scale={scale}
                onStep={stepScale}
                onPointerDown={onScalePointerDown}
                onKeyDown={onScaleKeyDown}
              />
            )}
          </div>
          </div>
        </div>
        </motion.div>
      </div>
    </div>
  );
}

function HotbarSlot({
  index,
  entry,
  skill,
  item,
  pressed,
  selected,
  assigning,
  menuOpen,
  moving,
  moveTarget,
  onActivate,
  onAssign,
  onOpenMenu,
  onUse,
  onMove,
  onClear,
}: {
  index: number;
  entry: HotbarEntry | null;
  skill?: Skill;
  item?: SheetItem;
  pressed: boolean;
  selected: boolean;
  assigning: boolean;
  menuOpen: boolean;
  moving: boolean;
  moveTarget: boolean;
  onActivate: () => void;
  onAssign: () => void;
  onOpenMenu: () => void;
  onUse: () => void;
  onMove: () => void;
  onClear: () => void;
}) {
  const key = HOTBAR_KEYS[index];
  const filled = !!entry && (!!skill || !!item);
  const label = skill?.name ?? item?.resource.name ?? `Hueco ${key} vacío`;
  const detail = item ? itemDescription(item) : null;
  const qty = item && item.quantity > 0 ? formatHotbarQty(item.quantity) : null;
  const Icon = skill ? (skillIcon[skill.skill_type] ?? Sparkles) : Sparkles;
  const skillArt = useSkillArt(skill ? skillArtSlug(skill) : null, skill?.skill_type, skill?.skill_catalog?.thumb_url);
  const skillTip = skill ? tipFromSkill(skill) : null;
  const holdRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHoldTimer() {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return (
    <div
      className="relative flex shrink-0 flex-col items-center"
      style={{ width: "calc(1.75rem * var(--hotbar-scale, 1.9))" }}
    >
      <span
        aria-hidden="true"
        className="hotbar-slot-tab mb-px border border-b-0 bg-[var(--hotbar-fill)]"
        style={{
          height: "calc(0.25rem * var(--hotbar-scale, 1.9))",
          width: "calc(0.625rem * var(--hotbar-scale, 1.9))",
          borderColor: selected ? "var(--gold-400)" : "var(--stroke-hotbar)",
          boxShadow: selected ? "0 0 6px var(--gold-400)" : "0 0 5px var(--hotbar)",
        }}
      />
      <div
        className={cn(
          "group relative w-full",
          selected
            ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.65)]"
            : "drop-shadow-[0_0_5px_rgba(255,45,106,0.5)]",
          pressed && "brightness-125",
          moving && "ring-1 ring-[var(--hotbar-pink)]",
          moveTarget && "brightness-110"
        )}
      >
        {filled && item && detail && !menuOpen && (
          <span
            role="tooltip"
            className={cn(
              "pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[var(--z-modal)] w-44 -translate-x-1/2 rounded-lg border border-[var(--stroke-hotbar)] bg-[rgba(12,4,10,0.96)] px-2 py-1.5 text-left shadow-[var(--glow-hotbar)]",
              "opacity-0 transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
              "group-hover:opacity-100 group-focus-within:opacity-100"
            )}
          >
            <span className="block font-display text-[11px] text-[var(--hotbar-pink)]">{label}</span>
            <span className="mt-0.5 block text-[10px] leading-snug text-[var(--text-2)]">{detail}</span>
          </span>
        )}
        <SkillHoverTip info={skillTip} disabled={!skill || menuOpen} className="block w-full">
        <button
          type="button"
          aria-label={filled ? `${label}. Tecla ${key}` : `Asignar al hueco ${key}`}
          onClick={() => {
            if (holdRef.current) {
              holdRef.current = false;
              return;
            }
            onActivate();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (filled) onOpenMenu();
            else onAssign();
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            clearHoldTimer();
            timerRef.current = setTimeout(() => {
              holdRef.current = true;
              if (filled) onOpenMenu();
              else onAssign();
            }, 500);
          }}
          onPointerUp={clearHoldTimer}
          onPointerLeave={clearHoldTimer}
          onPointerCancel={clearHoldTimer}
          className={cn(
            "hotbar-slot relative flex aspect-square w-full items-center justify-center",
            "border bg-[rgba(18,4,10,0.92)]",
            selected
              ? "border-[var(--gold-400)]"
              : assigning || menuOpen || moving
                ? "border-[var(--hotbar-pink)]"
                : "border-[var(--stroke-hotbar)]",
            filled ? "hover:brightness-125" : "hover:bg-[rgba(255,45,106,0.12)]"
          )}
        >
          {filled && item?.resource.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.resource.icon_url} alt="" className="h-[68%] w-[68%] object-contain" />
          ) : filled && skill && skillArt.ready && skillArt.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={skillArt.src}
              alt=""
              className="h-[78%] w-[78%] object-cover"
              onError={skillArt.markFailed}
            />
          ) : filled && skill ? (
            <Icon
              className="text-[var(--hotbar-pink)]"
              style={{
                width: "calc(12px * var(--hotbar-scale, 1.9))",
                height: "calc(12px * var(--hotbar-scale, 1.9))",
              }}
            />
          ) : filled && item ? (
            <span
              className="line-clamp-2 px-0.5 text-center font-display leading-tight text-[var(--hotbar-pink)]"
              style={{ fontSize: "calc(6px * var(--hotbar-scale, 1.9))" }}
            >
              {item.resource.name}
            </span>
          ) : (
            <span
              className="text-[rgba(255,45,106,0.28)]"
              style={{ fontSize: "calc(9px * var(--hotbar-scale, 1.9))" }}
            >
              +
            </span>
          )}
          {filled && item && itemIsUnique(item.resource) ? (
            <span className="absolute right-px top-px text-[var(--gold-400)] drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">
              <Star size={9} fill="currentColor" />
            </span>
          ) : null}
          {qty && (
            <span
              className="absolute bottom-px left-px font-stat leading-none text-[var(--hotbar)] drop-shadow-[0_0_4px_rgba(255,45,106,0.9)]"
              style={{ fontSize: "calc(7px * var(--hotbar-scale, 1.9))" }}
            >
              {qty}
            </span>
          )}
          {skill && isSkillChecked(skill) && (
            <span
              aria-hidden="true"
              className="absolute right-px top-px rounded-full bg-[var(--gold-400)] shadow-[0_0_6px_rgba(251,191,36,0.9)]"
              style={{
                height: "calc(0.375rem * var(--hotbar-scale, 1.9))",
                width: "calc(0.375rem * var(--hotbar-scale, 1.9))",
              }}
            />
          )}
        </button>
        </SkillHoverTip>
        {menuOpen && filled && (
          <div
            role="menu"
            className="absolute bottom-[calc(100%+6px)] left-1/2 z-[var(--z-modal)] w-[7.5rem] -translate-x-1/2 overflow-hidden rounded-lg border border-[var(--stroke-hotbar)] bg-[rgba(12,4,10,0.97)] py-1 shadow-[var(--glow-hotbar)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={onUse}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] text-[var(--text-1)] hover:bg-[rgba(255,45,106,0.16)]"
            >
              <Zap size={11} className="text-[var(--hotbar)]" />
              Usar
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onMove}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] text-[var(--text-1)] hover:bg-[rgba(255,45,106,0.16)]"
            >
              <ArrowLeftRight size={11} className="text-[var(--hotbar)]" />
              Mover
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onClear}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[11px] text-[var(--text-1)] hover:bg-[rgba(255,45,106,0.16)]"
            >
              <Trash2 size={11} className="text-[var(--hotbar)]" />
              Quitar
            </button>
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex items-center justify-center border bg-[rgba(18,4,10,0.92)] font-stat",
          selected
            ? "border-[var(--gold-400)] text-[var(--gold-400)] shadow-[0_0_8px_rgba(251,191,36,0.55)]"
            : "border-[var(--stroke-hotbar)] text-[var(--hotbar)] shadow-[0_0_6px_rgba(255,45,106,0.4)]"
        )}
        style={{
          height: "calc(0.875rem * var(--hotbar-scale, 1.9))",
          width: "calc(0.875rem * var(--hotbar-scale, 1.9))",
          fontSize: "calc(8px * var(--hotbar-scale, 1.9))",
        }}
      >
        {key}
      </span>
    </div>
  );
}

function ScaleCorner({
  scale,
  onStep,
  onPointerDown,
  onKeyDown,
}: {
  scale: number;
  onStep: (delta: number) => void;
  onPointerDown: (event: React.PointerEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}) {
  const atMin = scale <= HOTBAR_SCALE_MIN + 0.0001;
  const atMax = scale >= HOTBAR_SCALE_MAX - 0.0001;
  return (
    <div className="absolute bottom-0.5 right-0.5 z-[2] flex flex-col items-center rounded-[5px] bg-[rgba(18,4,10,0.82)] p-px text-[var(--hotbar-pink)] shadow-[0_0_8px_rgba(255,45,106,0.35)]">
      <button
        type="button"
        aria-label="Hotbar más grande"
        title="Más grande"
        disabled={atMax}
        onClick={() => onStep(HOTBAR_SCALE_STEP)}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex h-4 w-4 items-center justify-center rounded-[3px] transition-colors duration-[var(--t-ui)] hover:bg-[rgba(255,45,106,0.16)] hover:text-[var(--hotbar)] disabled:opacity-30"
      >
        <ZoomIn size={10} strokeWidth={2.6} />
      </button>
      <div
        role="slider"
        aria-label="Escala de la hotbar"
        aria-valuemin={Math.round(HOTBAR_SCALE_MIN * 100)}
        aria-valuemax={Math.round(HOTBAR_SCALE_MAX * 100)}
        aria-valuenow={Math.round(scale * 100)}
        aria-valuetext={`${Math.round((scale - 1) * 100)} por ciento más grande`}
        title="Arrastra para escalar"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        className="flex h-4 w-4 cursor-nwse-resize touch-none items-center justify-center rounded-[3px] text-[var(--hotbar)] transition-colors duration-[var(--t-ui)] hover:bg-[rgba(255,45,106,0.16)]"
      >
        <Scaling size={11} strokeWidth={2.4} />
      </div>
      <button
        type="button"
        aria-label="Hotbar más pequeña"
        title="Más pequeña"
        disabled={atMin}
        onClick={() => onStep(-HOTBAR_SCALE_STEP)}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex h-4 w-4 items-center justify-center rounded-[3px] transition-colors duration-[var(--t-ui)] hover:bg-[rgba(255,45,106,0.16)] hover:text-[var(--hotbar)] disabled:opacity-30"
      >
        <ZoomOut size={10} strokeWidth={2.6} />
      </button>
    </div>
  );
}
