"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SceneDicePhysics } from "@/components/hud/SceneDicePhysics";
import { crawlerAvatarUrl, crawlerInitials } from "@/lib/crawler-art";
import { dieLabel, type SceneDiceState } from "@/lib/scene-dice";

const EASE = [0.22, 1, 0.36, 1] as const;

export function SceneDiceCeremony({
  state,
  canRoll,
  onRoll,
  onClose,
}: {
  state: Extract<SceneDiceState, { mode: "ceremony" }> | null;
  canRoll: boolean;
  onRoll: () => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [shownValue, setShownValue] = useState<number | null>(null);
  const [skipRequest, setSkipRequest] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!state) {
      setShownValue(null);
      setFailedSrc(null);
      setSkipRequest(0);
      setDismissing(false);
      return;
    }
    if (state.value == null) {
      setShownValue(null);
      setSkipRequest(0);
      setDismissing(false);
      return;
    }
    if (reduceMotion) {
      setShownValue(state.value);
      return;
    }
    setShownValue(null);
  }, [reduceMotion, state]);

  useEffect(() => {
    if (shownValue == null || dismissing) return;
    const timer = window.setTimeout(() => onCloseRef.current(), 6500);
    return () => window.clearTimeout(timer);
  }, [dismissing, shownValue]);

  function dismiss() {
    if (shownValue == null || dismissing) return;
    if (reduceMotion) {
      onClose();
      return;
    }
    setDismissing(true);
  }

  useEffect(() => {
    if (!dismissing) return;
    const timer = window.setTimeout(() => onCloseRef.current(), 400);
    return () => window.clearTimeout(timer);
  }, [dismissing]);

  const open = !!state;
  const avatarSrc = state
    ? [crawlerAvatarUrl(state.name, state.portraitUrl, state.emotion), crawlerAvatarUrl(state.name, state.portraitUrl)]
        .filter((src): src is string => !!src && src !== failedSrc)[0] ?? null
    : null;
  const waiting = open && state && state.value == null;
  const spinning = !!state && state.value != null && shownValue == null && !reduceMotion;
  const caption = !state
    ? ""
    : shownValue != null
      ? `${dieLabel(state.sides)} · ${shownValue}`
      : spinning
        ? "Pulsa el marco para resolver"
        : canRoll
          ? "Pulsa el dado para tirar"
          : `${state.name} va a tirar`;

  return (
    <AnimatePresence>
      {open && state && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: dismissing ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: reduceMotion ? 0.01 : dismissing ? 0.32 : 0.28,
            delay: reduceMotion || !dismissing ? 0 : 0.08,
            ease: EASE,
          }}
          className="fixed inset-0 z-[var(--z-cinematic)] flex items-center justify-center p-4"
        >
          {shownValue != null ? (
            <button
              type="button"
              aria-label="Cerrar tirada"
              onClick={dismiss}
              className="absolute inset-0 bg-[rgba(5,6,13,0.78)] backdrop-blur-[18px]"
            />
          ) : (
            <div className="absolute inset-0 bg-[rgba(5,6,13,0.78)] backdrop-blur-[18px]" />
          )}

          <AnimatePresence>
            {dismissing && (
              <motion.span
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.82, 0] }}
                transition={{ duration: 0.2, times: [0, 0.28, 1], ease: EASE }}
                className="pointer-events-none absolute inset-0 z-[8] bg-[radial-gradient(circle_at_50%_46%,rgba(251,191,36,0.42),rgba(34,240,255,0.22)_38%,transparent_68%)]"
              />
            )}
          </AnimatePresence>

          <motion.div
            role="dialog"
            aria-label={`Tirada de ${state.name}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88, y: 18 }}
            animate={dismissing ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 10 }}
            transition={
              dismissing
                ? { duration: 0.32, delay: 0.08, ease: EASE }
                : { type: "spring", stiffness: 320, damping: 28, mass: 0.8 }
            }
            className={`scene-dice-frame relative w-[min(24rem,calc(100vw-2rem))] overflow-hidden px-5 pb-6 pt-6 text-center${spinning || shownValue != null ? " cursor-pointer" : ""}${dismissing ? " is-dismissing" : ""}`}
            onClick={() => {
              if (spinning) setSkipRequest((n) => n + 1);
              else if (shownValue != null) dismiss();
            }}
          >
            <span aria-hidden="true" className="scene-dice-tick -left-0.5 -top-0.5 border-l-2 border-t-2" />
            <span aria-hidden="true" className="scene-dice-tick -right-0.5 -top-0.5 border-r-2 border-t-2" />
            <span aria-hidden="true" className="scene-dice-tick -bottom-0.5 -left-0.5 border-b-2 border-l-2" />
            <span aria-hidden="true" className="scene-dice-tick -bottom-0.5 -right-0.5 border-b-2 border-r-2" />

            <div className="relative mx-auto h-[5.5rem] w-[5.5rem]">
              <span className="absolute inset-[-6px] rounded-full border border-[rgba(34,240,255,0.22)] shadow-[0_0_28px_rgba(0,212,255,0.2)]" />
              <span className="relative flex h-full w-full overflow-hidden rounded-full border-2 border-[var(--cyan-400)] bg-[rgba(8,10,18,0.92)] shadow-[var(--glow-cyan)]">
                {avatarSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setFailedSrc(avatarSrc)}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-xl tracking-[0.16em] text-[var(--cyan-300)]">
                    {crawlerInitials(state.name)}
                  </span>
                )}
              </span>
            </div>

            <p className="mt-3 font-display text-sm tracking-[0.18em] text-[var(--text-1)]">
              {state.name}
            </p>
            <p className="mt-0.5 font-stat text-[11px] uppercase tracking-[0.22em] text-[var(--cyan-400)]">
              {dieLabel(state.sides)}
            </p>

            <div className="mx-auto mt-4 flex h-3 w-[70%] items-center gap-2">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--cyan-400)]" />
              <span className="h-1.5 w-1.5 rotate-45 border border-[var(--cyan-400)] shadow-[0_0_8px_rgba(34,240,255,0.8)]" />
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--hotbar)]" />
            </div>

            <div className="relative mt-3">
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,240,255,0.12),transparent_62%)]" />
              <SceneDicePhysics
                sides={state.sides}
                rolling={spinning}
                waiting={!!waiting}
                canRoll={canRoll}
                seed={state.ts ^ ((state.value ?? 0) * 97 + state.sides * 13)}
                reduceMotion={!!reduceMotion}
                skipRequest={skipRequest}
                onRoll={onRoll}
                onSettled={() => {
                  if (state.value != null) setShownValue(state.value);
                }}
              />
              <AnimatePresence>
                {shownValue != null && (
                  <motion.span
                    key={shownValue}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.72 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center font-stat text-7xl text-[var(--text-1)] drop-shadow-[0_0_22px_rgba(251,191,36,0.75)]"
                  >
                    {shownValue}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="mx-auto mt-2 w-max min-w-[12.5rem] rounded-full border border-[rgba(34,240,255,0.35)] bg-[rgba(5,6,13,0.72)] px-4 py-1.5 shadow-[0_0_16px_rgba(0,212,255,0.18)]">
              <p className="font-display text-[10px] tracking-[0.16em] text-[var(--text-2)]">{caption}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
