"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import {
  clampLifeBoxes,
  clampMana,
  healthBoxValue,
  healthBarColor,
  healthPercent,
  MANA_BAR_COLOR,
  manaPercent,
} from "@/lib/rules";
import { cn } from "@/lib/utils";

export function useVitalPulse(initialColor = "#1faa3a") {
  const [pulse, setPulse] = useState({ key: 0, color: initialColor });
  function beat(color: string) {
    setPulse({ key: Date.now(), color });
  }
  return { pulse, beat };
}

interface HealthBoxesProps {
  /** Damage boxes filled (DB field). Displayed as 10 - boxesFilled remaining life. */
  boxesFilled: number;
  conEnhanced: number;
  className?: string;
  /** DM edit mode: click a box to set remaining life */
  interactive?: boolean;
  onLifeChange?: (lifeBoxes: number) => void;
}

const BOX_TRANSITION = { type: "tween" as const, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const };

function hexGlow(hex: string, alpha: number) {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function boxAnimate(hasLife: boolean, barColor: string) {
  return hasLife
    ? {
        backgroundColor: barColor,
        borderColor: barColor,
      }
    : {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
      };
}

function BoxValue({ hasLife, value }: { hasLife: boolean; value: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none font-stat text-xs font-semibold leading-none sm:text-sm",
        "transition-[color,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        hasLife
          ? "text-[var(--text-1)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]"
          : "text-[var(--text-4)] opacity-45"
      )}
    >
      {value}
    </span>
  );
}

function HealthPip({
  index,
  hasLife,
  boxValue,
  barColor,
  interactive,
  onSelect,
}: {
  index: number;
  hasLife: boolean;
  boxValue: number;
  barColor: string;
  interactive: boolean;
  onSelect: (index: number) => void;
}) {
  const isEmpty = !hasLife;
  const title = `Casilla ${index + 1} · ${boxValue} HP${hasLife ? " (vida)" : " (vacía)"}`;
  const className = cn(
    "relative z-[1] flex aspect-square min-w-0 flex-1 items-center justify-center rounded-sm border",
    interactive && "cursor-pointer"
  );
  const motionProps = {
    initial: false as const,
    animate: boxAnimate(hasLife, barColor),
    transition: BOX_TRANSITION,
  };

  if (interactive) {
    return (
      <motion.button
        type="button"
        onClick={() => onSelect(index)}
        title={isEmpty ? `${title} — clic para rellenar` : title}
        className={className}
        {...motionProps}
        whileHover={isEmpty ? { backgroundColor: "rgba(255,255,255,0.08)" } : { scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <BoxValue hasLife={hasLife} value={boxValue} />
      </motion.button>
    );
  }

  return (
    <motion.div title={title} className={className} {...motionProps}>
      <BoxValue hasLife={hasLife} value={boxValue} />
    </motion.div>
  );
}

/** 10 casillas. Cada una vale el modificador de CON+; el daño incompleto no vacía la siguiente. */
export function HealthBoxes({
  boxesFilled,
  conEnhanced,
  className,
  interactive = false,
  onLifeChange,
}: HealthBoxesProps) {
  const boxValue = healthBoxValue(conEnhanced);
  const damageFilled = Math.min(Math.max(boxesFilled, 0), 10);
  const lifeBoxes = 10 - damageFilled;
  const pct = healthPercent(damageFilled);
  const barColor = healthBarColor(lifeBoxes);

  function setLife(next: number) {
    if (!interactive || !onLifeChange) return;
    onLifeChange(clampLifeBoxes(next));
  }

  function handleBoxClick(index: number) {
    const clickedRemaining = index + 1;
    setLife(clickedRemaining === lifeBoxes ? lifeBoxes - 1 : clickedRemaining);
  }

  function stepLife(delta: -1 | 1) {
    setLife(lifeBoxes + delta);
  }

  return (
    <div
      className={cn("space-y-2", className)}
      role="group"
      aria-label={`Barra de salud ${pct}% · ${lifeBoxes} de 10 casillas`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-label">Barra de salud</span>
        <div className="flex items-center gap-1.5">
          {interactive && (
            <StepperButton
              label="Bajar vida"
              delta={-1}
              disabled={lifeBoxes <= 0}
              onClick={() => stepLife(-1)}
            />
          )}
          <span
            className="font-stat text-sm tabular-nums transition-colors duration-500"
            style={{ color: barColor }}
          >
            {lifeBoxes}/10 · {pct}%
          </span>
          {interactive && (
            <StepperButton
              label="Subir vida"
              delta={1}
              disabled={lifeBoxes >= 10}
              onClick={() => stepLife(1)}
            />
          )}
        </div>
      </div>
      <div className="relative flex gap-1 overflow-visible">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-0.5 left-0 origin-left rounded-[6px]"
          initial={false}
          animate={{
            width: `${(lifeBoxes / 10) * 100}%`,
            opacity: lifeBoxes > 0 ? 1 : 0,
            boxShadow: `0 0 0 1px ${hexGlow(barColor, 0.55)}, 0 0 8px ${hexGlow(barColor, 0.42)}, 0 0 16px ${hexGlow(barColor, 0.2)}`,
          }}
          transition={BOX_TRANSITION}
        />
        {Array.from({ length: 10 }).map((_, i) => (
          <HealthPip
            key={i}
            index={i}
            hasLife={i < lifeBoxes}
            boxValue={boxValue}
            barColor={barColor}
            interactive={interactive}
            onSelect={handleBoxClick}
          />
        ))}
      </div>
    </div>
  );
}

interface ResourceBarProps {
  label: string;
  current: number;
  max: number;
  color?: string;
  className?: string;
  compact?: boolean;
  interactive?: boolean;
  onCurrentChange?: (next: number) => void;
}

function valueFromPointer(el: HTMLElement, clientX: number, max: number) {
  const rect = el.getBoundingClientRect();
  const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
  return clampMana(ratio * max, max);
}

export function ResourceBar({
  label,
  current,
  max,
  color = MANA_BAR_COLOR,
  className,
  compact = false,
  interactive = false,
  onCurrentChange,
}: ResourceBarProps) {
  const cap = Math.max(0, max);
  const value = clampMana(current, cap);
  const pct = manaPercent(value, cap);
  const showSteppers = interactive && !compact;

  function setCurrent(next: number) {
    if (!interactive || !onCurrentChange) return;
    onCurrentChange(clampMana(next, cap));
  }

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-label">{label}</span>
        <div className="flex items-center gap-1.5">
          {showSteppers && (
            <StepperButton
              label={`Bajar ${label.toLowerCase()}`}
              delta={-1}
              disabled={value <= 0}
              onClick={() => setCurrent(value - 1)}
            />
          )}
          <span
            className={cn("font-stat tabular-nums", compact ? "text-xs" : "text-sm")}
            style={{ color }}
          >
            {value}/{cap} · {Math.round(pct)}%
          </span>
          {showSteppers && (
            <StepperButton
              label={`Subir ${label.toLowerCase()}`}
              delta={1}
              disabled={value >= cap}
              onClick={() => setCurrent(value + 1)}
            />
          )}
        </div>
      </div>
      <ColorFill
        label={label}
        pct={pct}
        color={color}
        compact={compact}
        interactive={interactive}
        value={value}
        max={cap}
        onPointerValue={(el, x) => setCurrent(valueFromPointer(el, x, cap))}
        onStep={(delta) => setCurrent(value + delta)}
        onJump={(next) => setCurrent(next)}
      />
    </div>
  );
}

function ColorFill({
  label,
  pct,
  color,
  compact = false,
  interactive = false,
  value,
  max,
  onPointerValue,
  onStep,
  onJump,
}: {
  label: string;
  pct: number;
  color: string;
  compact?: boolean;
  interactive?: boolean;
  value?: number;
  max?: number;
  onPointerValue?: (el: HTMLElement, clientX: number) => void;
  onStep?: (delta: -1 | 1) => void;
  onJump?: (next: number) => void;
}) {
  const hasValue = value !== undefined && max !== undefined;

  return (
    <div
      role={interactive ? "slider" : "meter"}
      aria-label={label}
      aria-valuemin={interactive || hasValue ? 0 : undefined}
      aria-valuemax={hasValue ? max : 100}
      aria-valuenow={hasValue ? value : Math.round(pct)}
      aria-valuetext={
        hasValue
          ? `${value} de ${max}, ${Math.round(pct)} por ciento`
          : `${Math.round(pct)} por ciento`
      }
      tabIndex={interactive ? 0 : undefined}
      title={`${label} ${Math.round(pct)}%`}
      onClick={
        interactive && onPointerValue
          ? (e) => onPointerValue(e.currentTarget, e.clientX)
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                onStep?.(-1);
              }
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                onStep?.(1);
              }
              if (e.key === "Home") {
                e.preventDefault();
                onJump?.(0);
              }
              if (e.key === "End" && max !== undefined) {
                e.preventDefault();
                onJump?.(max);
              }
            }
          : undefined
      }
      className={cn(
        "relative overflow-hidden rounded-full bg-[var(--void-800)]",
        compact ? "h-1.5" : "h-2.5",
        interactive && "cursor-pointer outline-none focus-visible:shadow-[var(--glow-cyan)]"
      )}
    >
      <motion.div
        className="h-full rounded-full"
        initial={false}
        animate={{
          width: `${Math.max(pct, 0)}%`,
          backgroundColor: color,
          boxShadow:
            pct > 0
              ? `0 0 10px ${hexGlow(color, 0.7)}, 0 0 18px ${hexGlow(color, 0.35)}`
              : "0 0 0 transparent",
        }}
        transition={BOX_TRANSITION}
      />
    </div>
  );
}

function StepperButton({
  label,
  delta,
  disabled,
  onClick,
}: {
  label: string;
  delta: -1 | 1;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[var(--stroke-glass)] text-[var(--text-2)] transition-colors duration-[var(--t-ui)] hover:border-[var(--stroke-cyan)] hover:text-[var(--cyan-400)] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {delta < 0 ? <Minus size={12} /> : <Plus size={12} />}
    </button>
  );
}
