"use client";

import { useEffect, useRef } from "react";
import { DIE_ICONS } from "@/components/hud/dice-icons";
import type { SceneDieSides } from "@/lib/scene-dice";

const DIE_PX = 76;
const HALF = DIE_PX / 2;
const RESTITUTION = 0.84;
const GRAVITY = 1180;
const MIN_TIME = 3.15;
const MAX_TIME = 4.85;

type Impact = { id: number; x: number; y: number; axis: "x" | "y"; born: number };

type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  spin: number;
  squashX: number;
  squashY: number;
  blinkOn: boolean;
  nextBlink: number;
  impactId: number;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function SceneDicePhysics({
  sides,
  rolling,
  waiting,
  canRoll,
  seed,
  reduceMotion,
  onRoll,
  onSettled,
}: {
  sides: SceneDieSides;
  rolling: boolean;
  waiting: boolean;
  canRoll: boolean;
  seed: number;
  reduceMotion: boolean;
  onRoll: () => void;
  onSettled: () => void;
}) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const dieRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef(false);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    settledRef.current = false;
    const arena = arenaRef.current;
    const die = dieRef.current;
    const icon = iconRef.current;
    if (!arena || !die || !icon) return;

    icon.classList.toggle("scene-die-idle", waiting && !rolling && !reduceMotion);

    if (!rolling || reduceMotion) {
      die.style.transition = "opacity 280ms ease";
      die.style.opacity = waiting ? "1" : "0.2";
      die.style.transform = `translate(${arena.clientWidth / 2 - HALF}px, ${arena.clientHeight / 2 - HALF}px)`;
      icon.style.transform = "rotate(0deg)";
      if (flashRef.current) flashRef.current.style.opacity = "0";
      if (rolling && reduceMotion) onSettledRef.current();
      return;
    }

    die.style.transition = "none";

    icon.classList.remove("scene-die-idle");

    const rand = mulberry32(seed || 1);
    const w0 = () => Math.max(arena.clientWidth, DIE_PX + 8);
    const h0 = () => Math.max(arena.clientHeight, DIE_PX + 8);
    const throwAngle = rand() * Math.PI * 2;
    const throwSpeed = 920 + rand() * 480;
    const body: Body = {
      x: w0() / 2,
      y: h0() / 2,
      vx: Math.cos(throwAngle) * throwSpeed,
      vy: Math.sin(throwAngle) * throwSpeed - 160,
      rot: rand() * 360,
      spin: (rand() < 0.5 ? -1 : 1) * (720 + rand() * 520),
      squashX: 1,
      squashY: 1,
      blinkOn: true,
      nextBlink: 0.05,
      impactId: 0,
    };

    const impacts: Impact[] = [];
    let last = performance.now();
    let elapsed = 0;
    let frame = 0;

    const tick = (now: number) => {
      const rawDt = (now - last) / 1000;
      last = now;
      const dt = clamp(rawDt, 0.001, 0.028);
      elapsed += dt;
      const progress = clamp(elapsed / MAX_TIME, 0, 1);
      const ease = progress * progress;
      const width = w0();
      const height = h0();
      const cx = width / 2;
      const cy = height / 2;

      const attract = 3.2 + ease * 22;
      const damp = 0.12 + ease * 3.4;
      const gravity = GRAVITY * (1 - ease * 0.82);

      body.vx += (cx - body.x) * attract * dt;
      body.vy += (cy - body.y) * attract * dt;
      body.vy += gravity * dt;
      body.vx *= Math.exp(-damp * dt);
      body.vy *= Math.exp(-damp * dt);
      body.spin *= Math.exp(-(0.22 + ease * 2.1) * dt);

      body.x += body.vx * dt;
      body.y += body.vy * dt;
      body.rot += body.spin * dt;
      body.squashX += (1 - body.squashX) * clamp(dt * 14, 0, 1);
      body.squashY += (1 - body.squashY) * clamp(dt * 14, 0, 1);

      const minX = HALF;
      const maxX = width - HALF;
      const minY = HALF;
      const maxY = height - HALF;
      let hit: "x" | "y" | null = null;
      let hitX = body.x;
      let hitY = body.y;

      if (body.x < minX) {
        body.x = minX;
        body.vx = Math.abs(body.vx) * RESTITUTION + 40 * (1 - ease);
        body.squashX = 0.72;
        body.squashY = 1.16;
        hit = "x";
        hitX = 2;
        hitY = body.y;
      } else if (body.x > maxX) {
        body.x = maxX;
        body.vx = -Math.abs(body.vx) * RESTITUTION - 40 * (1 - ease);
        body.squashX = 0.72;
        body.squashY = 1.16;
        hit = "x";
        hitX = width - 2;
        hitY = body.y;
      }

      if (body.y < minY) {
        body.y = minY;
        body.vy = Math.abs(body.vy) * RESTITUTION + 36 * (1 - ease);
        body.squashY = 0.7;
        body.squashX = 1.18;
        hit = "y";
        hitX = body.x;
        hitY = 2;
      } else if (body.y > maxY) {
        body.y = maxY;
        body.vy = -Math.abs(body.vy) * RESTITUTION - 36 * (1 - ease);
        body.squashY = 0.7;
        body.squashX = 1.18;
        hit = "y";
        hitX = body.x;
        hitY = height - 2;
      }

      if (hit && progress < 0.72) {
        const kick = 380 + (1 - ease) * 520;
        body.spin = (body.spin === 0 ? 1 : -Math.sign(body.spin)) * kick;
        body.impactId += 1;
        impacts.push({ id: body.impactId, x: hitX, y: hitY, axis: hit, born: elapsed });
        if (progress < 0.38) {
          body.vx += (rand() - 0.5) * 220;
          body.vy += (rand() - 0.5) * 160;
        }
      }

      const period = 0.055 + ease * 0.52;
      if (elapsed >= body.nextBlink) {
        body.blinkOn = !body.blinkOn;
        body.nextBlink = elapsed + period * (body.blinkOn ? 0.62 : 0.38);
      }
      if (progress > 0.9) body.blinkOn = true;

      const speed = Math.hypot(body.vx, body.vy);
      const dist = Math.hypot(body.x - cx, body.y - cy);
      const settled =
        !settledRef.current &&
        ((elapsed >= MIN_TIME && speed < 48 && dist < 16 && Math.abs(body.spin) < 80) ||
          elapsed >= MAX_TIME);

      die.style.opacity = body.blinkOn ? "1" : progress > 0.55 ? "0.22" : "0.08";
      die.style.transform = `translate(${body.x - HALF}px, ${body.y - HALF}px) scale(${body.squashX}, ${body.squashY})`;
      icon.style.transform = `rotate(${body.rot}deg)`;

      if (flashRef.current) {
        const live = impacts.filter((imp) => elapsed - imp.born < 0.16);
        const lastHit = live[live.length - 1];
        if (lastHit) {
          const fade = 1 - (elapsed - lastHit.born) / 0.16;
          flashRef.current.style.opacity = String(fade);
          flashRef.current.style.left = `${lastHit.x - 14}px`;
          flashRef.current.style.top = `${lastHit.y - 14}px`;
        } else {
          flashRef.current.style.opacity = "0";
        }
        for (let i = impacts.length - 1; i >= 0; i--) {
          if (elapsed - impacts[i].born > 0.18) impacts.splice(i, 1);
        }
      }

      if (settled) {
        settledRef.current = true;
        body.x = cx;
        body.y = cy;
        die.style.opacity = "1";
        die.style.transform = `translate(${cx - HALF}px, ${cy - HALF}px)`;
        icon.style.transform = "rotate(0deg)";
        onSettledRef.current();
        return;
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reduceMotion, rolling, seed, waiting]);

  const DieIcon = DIE_ICONS[sides];

  return (
    <div
      ref={arenaRef}
      className="relative h-[min(42vh,20rem)] w-full overflow-hidden rounded-[18px] border border-[rgba(34,240,255,0.28)] bg-[rgba(5,6,13,0.35)] shadow-[inset_0_0_24px_rgba(0,212,255,0.08)]"
    >
      <span
        ref={flashRef}
        aria-hidden="true"
        className="pointer-events-none absolute h-7 w-7 rounded-full bg-[radial-gradient(circle,rgba(34,240,255,0.95),transparent_70%)] opacity-0"
      />
      <button
        type="button"
        disabled={!canRoll || !waiting}
        onClick={onRoll}
        aria-label={canRoll && waiting ? `Tirar d${sides}` : `Dado d${sides}`}
        className="absolute inset-0 z-[1] cursor-default disabled:cursor-default"
        style={{ cursor: canRoll && waiting ? "pointer" : "default" }}
      />
      <div
        ref={dieRef}
        className="pointer-events-none absolute left-0 top-0 z-[2] will-change-transform"
        style={{ width: DIE_PX, height: DIE_PX }}
      >
        <div
          ref={iconRef}
          className="flex h-full w-full items-center justify-center text-[var(--cyan-300)] drop-shadow-[0_0_16px_rgba(34,240,255,0.7)]"
        >
          <DieIcon className="h-[4.75rem] w-[4.75rem]" />
        </div>
      </div>
    </div>
  );
}
