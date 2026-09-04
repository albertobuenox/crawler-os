"use client";

import { motion } from "framer-motion";
import { healthBoxValue, healthBarColor, healthPercent } from "@/lib/rules";
import { cn } from "@/lib/utils";

interface HealthBoxesProps {
  /** Damage boxes filled (DB field). Displayed as 10 - boxesFilled remaining life. */
  boxesFilled: number;
  conEnhanced: number;
  className?: string;
  /** DM edit mode: click a box to set remaining life */
  interactive?: boolean;
  onLifeChange?: (lifeBoxes: number) => void;
}

const BOX_TRANSITION = { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const };

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
    "flex aspect-square min-w-0 flex-1 items-center justify-center rounded-sm border",
    interactive && "cursor-pointer",
    isEmpty && "border-[var(--stroke-glass)] bg-[rgba(255,255,255,0.04)]",
    interactive && isEmpty && "hover:bg-[rgba(255,255,255,0.08)]"
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
        whileHover={isEmpty ? { scale: 1.08 } : { scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
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

  function handleBoxClick(index: number) {
    if (!interactive || !onLifeChange) return;
    onLifeChange(index + 1);
  }

  return (
    <div
      className={cn("space-y-2", className)}
      role="group"
      aria-label={`Barra de salud ${pct}% · ${lifeBoxes} de 10 casillas`}
    >
      <div className="flex items-center justify-between">
        <span className="text-label">Barra de salud</span>
        <span
          className="font-stat text-sm tabular-nums transition-colors duration-500"
          style={{ color: barColor }}
        >
          {lifeBoxes}/10 · {pct}%
        </span>
      </div>
      <div className="flex gap-1 overflow-visible">
        {lifeBoxes > 0 && (
          <motion.div
            layout
            className="flex min-w-0 gap-1 rounded-[6px] p-0.5"
            style={{ flex: lifeBoxes }}
            initial={false}
            animate={{
              boxShadow: `0 0 0 1px ${hexGlow(barColor, 0.72)}, 0 0 7px ${hexGlow(barColor, 0.8)}, 0 0 16px ${hexGlow(barColor, 0.38)}`,
            }}
            transition={BOX_TRANSITION}
          >
            {Array.from({ length: lifeBoxes }).map((_, i) => (
              <HealthPip
                key={i}
                index={i}
                hasLife
                boxValue={boxValue}
                barColor={barColor}
                interactive={interactive}
                onSelect={handleBoxClick}
              />
            ))}
          </motion.div>
        )}
        {lifeBoxes < 10 && (
          <div className="flex min-w-0 gap-1 p-0.5" style={{ flex: 10 - lifeBoxes }}>
            {Array.from({ length: 10 - lifeBoxes }).map((_, offset) => {
              const i = lifeBoxes + offset;
              return (
                <HealthPip
                  key={i}
                  index={i}
                  hasLife={false}
                  boxValue={boxValue}
                  barColor={barColor}
                  interactive={interactive}
                  onSelect={handleBoxClick}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface ResourceBarProps {
  label: string;
  current: number;
  max: number;
  color?: string;
}

export function ResourceBar({
  label,
  current,
  max,
  color = "var(--mana)",
}: ResourceBarProps) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-label">{label}</span>
        <span className="font-stat text-[var(--text-2)]">
          {current}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--void-800)]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}
