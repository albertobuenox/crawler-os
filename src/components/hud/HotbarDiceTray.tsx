"use client";

import { useEffect, useState, type SVGProps } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { D2Icon, D4Icon, D6Icon, D8Icon, D10Icon, D20Icon } from "@/components/hud/dice-icons";
import type { SceneDieSides } from "@/lib/scene-dice";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const FOLD = { type: "spring" as const, stiffness: 360, damping: 34, mass: 0.72 };

const AUX_DICE = [
  { sides: 2 as const, label: "d2", Icon: D2Icon },
  { sides: 4 as const, label: "d4", Icon: D4Icon },
  { sides: 6 as const, label: "d6", Icon: D6Icon },
  { sides: 8 as const, label: "d8", Icon: D8Icon },
  { sides: 10 as const, label: "d10", Icon: D10Icon },
  { sides: 20 as const, label: "d20", Icon: D20Icon },
];

type RollFlash = { id: number; sides: number; value: number };

function rollDie(sides: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % sides) + 1;
}

export function HotbarDiceTray({
  open,
  onToggle,
  onPick,
  locked = false,
}: {
  open: boolean;
  onToggle: () => void;
  onPick?: (sides: SceneDieSides) => void;
  locked?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const motionFold = reduceMotion ? { duration: 0.01 } : FOLD;
  const [flash, setFlash] = useState<RollFlash | null>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 2200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  function roll(sides: SceneDieSides) {
    if (onPick) {
      onPick(sides);
      return;
    }
    const value = rollDie(sides);
    setFlash({ id: Date.now(), sides, value });
  }

  return (
    <div className="pointer-events-auto absolute left-0 top-0 z-[2] flex select-none items-center">
      <button
        type="button"
        aria-label={open ? "Ocultar dados" : "Mostrar dados"}
        aria-expanded={open}
        disabled={locked && !open}
        title={locked && !open ? "Otro crawler está tirando" : open ? "Ocultar dados" : "Mostrar dados"}
        onClick={onToggle}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "hotbar-d20 relative z-[2] flex shrink-0 items-center justify-center rounded-full border backdrop-blur-md",
          "transition-[color,border-color,background-color,box-shadow] duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
          open ? "hotbar-d20-on" : "hotbar-d20-off",
          locked && !open && "cursor-not-allowed opacity-40"
        )}
        style={{
          height: "calc(2.15rem * var(--hotbar-scale, 1.9))",
          width: "calc(2.15rem * var(--hotbar-scale, 1.9))",
        }}
      >
        <span
          className="relative flex items-center justify-center"
          style={{
            width: "calc(1.35rem * var(--hotbar-scale, 1.9))",
            height: "calc(1.35rem * var(--hotbar-scale, 1.9))",
          }}
        >
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            animate={{
              opacity: open ? 0 : 1,
              scale: open ? 0.62 : 1,
              rotate: open ? 18 : 0,
            }}
            transition={motionFold}
          >
            <D20Icon className="h-full w-full" />
          </motion.span>
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
            initial={false}
            animate={{
              opacity: open ? 1 : 0,
              scaleX: open ? 1 : 0.18,
              scaleY: open ? 1 : 0.4,
            }}
            transition={motionFold}
          >
            <MinusMark className="h-[38%] w-[68%]" />
          </motion.span>
        </span>
      </button>

      <div
        className={cn("relative z-[1] overflow-hidden", !open && "pointer-events-none")}
        style={{
          maxWidth: open ? "26rem" : 0,
          marginLeft: "calc(-0.95rem * var(--hotbar-scale, 1.9))",
          transition: reduceMotion
            ? "none"
            : "max-width 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <motion.div
          initial={false}
          animate={{ opacity: open ? 1 : 0, x: open ? 0 : -10 }}
          transition={motionFold}
        >
          <div
            role="toolbar"
            aria-hidden={!open}
            aria-label="Dados auxiliares"
            className={cn(
              "flex w-max items-end rounded-r-[10px] border border-l-0 border-[var(--stroke-hotbar)]",
              "bg-[var(--hotbar-fill)] shadow-[var(--glow-hotbar)] backdrop-blur-md",
              "pl-[calc(1.2rem*var(--hotbar-scale,1.9))] pr-[calc(0.35rem*var(--hotbar-scale,1.9))]",
              "pb-[calc(0.2rem*var(--hotbar-scale,1.9))] pt-[calc(0.18rem*var(--hotbar-scale,1.9))]"
            )}
            style={{
              gap: "calc(0.22rem * var(--hotbar-scale, 1.9))",
            }}
          >
            {AUX_DICE.map(({ sides, label, Icon }) => (
              <button
                key={label}
                type="button"
                tabIndex={open ? 0 : -1}
                aria-label={`Tirar ${label}`}
                title={`Tirar ${label}`}
                onClick={() => roll(sides)}
                onPointerDown={(e) => e.stopPropagation()}
                className="relative flex flex-col items-center text-[var(--hotbar)] transition-[color,filter] duration-[var(--t-ui)] hover:text-[var(--hotbar-pink)] hover:brightness-125"
                style={{
                  width: "calc(1.35rem * var(--hotbar-scale, 1.9))",
                }}
              >
                <Icon
                  style={{
                    width: "calc(0.92rem * var(--hotbar-scale, 1.9))",
                    height: "calc(0.92rem * var(--hotbar-scale, 1.9))",
                  }}
                />
                <FaceBadge label={label} />
                <AnimatePresence>
                  {flash && flash.sides === sides && (
                    <motion.span
                      key={flash.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="pointer-events-none absolute -top-5 font-stat leading-none text-[var(--hotbar-pink)] drop-shadow-[0_0_8px_rgba(255,45,106,0.9)]"
                      style={{ fontSize: "calc(9px * var(--hotbar-scale, 1.9))" }}
                    >
                      {flash.value}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function FaceBadge({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="mt-px flex items-center justify-center rounded-[3px] border border-[var(--stroke-hotbar)] bg-[rgba(18,4,10,0.92)] font-stat leading-none text-[var(--hotbar)] shadow-[0_0_6px_rgba(255,45,106,0.4)]"
      style={{
        height: "calc(0.7rem * var(--hotbar-scale, 1.9))",
        minWidth: "calc(0.85rem * var(--hotbar-scale, 1.9))",
        paddingInline: "calc(0.14rem * var(--hotbar-scale, 1.9))",
        fontSize: "calc(6.5px * var(--hotbar-scale, 1.9))",
      }}
    >
      {label}
    </span>
  );
}

function iconProps(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 32 32",
    fill: "none",
    "aria-hidden": true as const,
    ...props,
  };
}

function MinusMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path
        d="M5 16 H27"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

