"use client";

import { motion } from "framer-motion";
import { healthBoxValue, healthBarColor } from "@/lib/rules";
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

function boxAnimate(hasLife: boolean, barColor: string) {
  return hasLife
    ? {
        backgroundColor: barColor,
        borderColor: barColor,
        boxShadow: `0 0 10px ${barColor}88`,
      }
    : {
        backgroundColor: "rgba(255,255,255,0.04)",
        borderColor: "rgba(255,255,255,0.1)",
        boxShadow: "0 0 0px transparent",
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
  const barColor = healthBarColor(lifeBoxes);

  function handleBoxClick(index: number) {
    if (!interactive || !onLifeChange) return;
    onLifeChange(index + 1);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-label">Barra de salud</span>
        <span
          className="font-stat text-sm transition-colors duration-500"
          style={{ color: barColor }}
        >
          {lifeBoxes}/10 casillas
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const hasLife = i < lifeBoxes;
          const isEmpty = !hasLife;
          const title = `Casilla ${i + 1} · ${boxValue} HP${hasLife ? " (vida)" : " (vacía)"}`;

          if (interactive) {
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => handleBoxClick(i)}
                title={isEmpty ? `${title} — clic para rellenar` : title}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-sm border cursor-pointer",
                  isEmpty && "border-[var(--stroke-glass)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)]"
                )}
                initial={false}
                animate={boxAnimate(hasLife, barColor)}
                transition={BOX_TRANSITION}
                whileHover={isEmpty ? { scale: 1.08 } : { scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
              >
                <BoxValue hasLife={hasLife} value={boxValue} />
              </motion.button>
            );
          }

          return (
            <motion.div
              key={i}
              title={title}
              className="flex aspect-square items-center justify-center rounded-sm border"
              initial={false}
              animate={boxAnimate(hasLife, barColor)}
              transition={BOX_TRANSITION}
            >
              <BoxValue hasLife={hasLife} value={boxValue} />
            </motion.div>
          );
        })}
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
