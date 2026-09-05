"use client";

import { useState, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { EMPTY_MINIMAP_COPY } from "@/lib/copy";
import {
  clamp01,
  fixtureHoverCopy,
  isMinimapEmpty,
  pointsToPath,
  tokenFill,
  tokenHoverCopy,
  type MinimapHoverCopy,
} from "@/lib/minimap";
import type { MinimapDoc, MinimapFixture, MinimapPoint, MinimapStroke } from "@/lib/types";
import { cn } from "@/lib/utils";

export function clientToMinimapPoint(
  event: { clientX: number; clientY: number },
  el: HTMLElement
): MinimapPoint {
  const rect = el.getBoundingClientRect();
  const w = rect.width || 1;
  const h = rect.height || 1;
  return {
    x: clamp01((event.clientX - rect.left) / w),
    y: clamp01((event.clientY - rect.top) / h),
  };
}

export function MinimapCanvas({
  doc,
  viewer,
  selfId,
  selectedId,
  draftStroke,
  interactive,
  showLabels,
  emptyCopy = EMPTY_MINIMAP_COPY,
  blackout = false,
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  doc: MinimapDoc;
  viewer: "dm" | "crawler";
  selfId?: string | null;
  selectedId?: string | null;
  draftStroke?: MinimapStroke | null;
  interactive?: boolean;
  showLabels?: boolean;
  emptyCopy?: string;
  blackout?: boolean;
  className?: string;
  onPointerDown?: (event: ReactPointerEvent<HTMLDivElement>, point: MinimapPoint) => void;
  onPointerMove?: (event: ReactPointerEvent<HTMLDivElement>, point: MinimapPoint) => void;
  onPointerUp?: (event: ReactPointerEvent<HTMLDivElement>, point: MinimapPoint) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const empty = isMinimapEmpty(doc) && !draftStroke;
  const [hover, setHover] = useState<{
    id: string;
    x: number;
    y: number;
    copy: MinimapHoverCopy;
  } | null>(null);

  function pointFrom(event: ReactPointerEvent<HTMLDivElement>) {
    return clientToMinimapPoint(event, event.currentTarget);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-[var(--r-md)]",
        blackout
          ? "border border-[rgba(255,255,255,0.06)] bg-[#000] shadow-none"
          : "border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.92)] shadow-[var(--glow-cyan)]",
        interactive && "touch-none",
        className
      )}
      style={
        blackout
          ? undefined
          : {
              backgroundImage:
                "radial-gradient(circle, rgba(0,212,255,0.26) 1px, transparent 1.15px)",
              backgroundSize: "12px 12px",
            }
      }
      onPointerDown={
        interactive
          ? (event) => {
              if (event.button !== 0) return;
              setHover(null);
              onPointerDown?.(event, pointFrom(event));
            }
          : undefined
      }
      onPointerMove={
        interactive
          ? (event) => {
              onPointerMove?.(event, pointFrom(event));
            }
          : undefined
      }
      onPointerUp={
        interactive
          ? (event) => {
              onPointerUp?.(event, pointFrom(event));
            }
          : undefined
      }
      onPointerCancel={
        interactive
          ? (event) => {
              onPointerUp?.(event, pointFrom(event));
            }
          : undefined
      }
      onPointerLeave={() => setHover(null)}
    >
      {!blackout && <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {doc.strokes.map((stroke) => (
          <path
            key={stroke.id}
            d={pointsToPath(stroke.points)}
            fill="none"
            pointerEvents="none"
            stroke={stroke.tool === "wall" ? "var(--cyan-400)" : "rgba(248,250,252,0.55)"}
            strokeWidth={stroke.tool === "wall" ? 2.5 : 1.15}
            strokeLinecap={stroke.tool === "wall" ? "square" : "round"}
            strokeLinejoin={stroke.tool === "wall" ? "miter" : "round"}
            opacity={stroke.tool === "wall" ? 0.9 : 0.75}
          />
        ))}
        {draftStroke && (
          <path
            d={pointsToPath(draftStroke.points)}
            fill="none"
            pointerEvents="none"
            stroke={draftStroke.tool === "wall" ? "var(--cyan-300)" : "rgba(248,250,252,0.8)"}
            strokeWidth={draftStroke.tool === "wall" ? 2.5 : 1.15}
            strokeLinecap={draftStroke.tool === "wall" ? "square" : "round"}
            strokeDasharray={draftStroke.tool === "wall" ? "2 1.4" : undefined}
            opacity={0.95}
          />
        )}
        {doc.fixtures.map((fixture) => {
          const copy = fixtureHoverCopy(fixture);
          return (
            <g
              key={fixture.id}
              transform={`translate(${fixture.x * 100} ${fixture.y * 100}) rotate(${fixture.rotation})`}
              className={blackout ? undefined : interactive ? "cursor-pointer" : "cursor-help"}
              aria-label={`${copy.legend}: ${copy.detail}`}
              onPointerEnter={
                blackout
                  ? undefined
                  : () =>
                      setHover({
                        id: fixture.id,
                        x: fixture.x,
                        y: fixture.y,
                        copy,
                      })
              }
              onPointerLeave={
                blackout
                  ? undefined
                  : () => setHover((current) => (current?.id === fixture.id ? null : current))
              }
            >
              <circle r="5.2" fill="transparent" />
              <FixtureMark fixture={fixture} selected={selectedId === fixture.id} />
            </g>
          );
        })}
        {doc.tokens.map((token) => {
          const fill = tokenFill(token, viewer, selfId);
          const selected = selectedId === token.id;
          const radius = viewer === "crawler" ? 2.05 : 2.25;
          const copy = tokenHoverCopy(token, viewer, selfId);
          return (
            <g
              key={token.id}
              transform={`translate(${token.x * 100} ${token.y * 100})`}
              className={blackout ? undefined : interactive ? "cursor-pointer" : "cursor-help"}
              aria-label={`${copy.legend}: ${copy.detail}`}
              onPointerEnter={
                blackout
                  ? undefined
                  : () =>
                      setHover({
                        id: token.id,
                        x: token.x,
                        y: token.y,
                        copy,
                      })
              }
              onPointerLeave={
                blackout ? undefined : () => setHover((current) => (current?.id === token.id ? null : current))
              }
            >
              <circle r="5.4" fill="transparent" />
              <circle r={selected ? 4.2 : 3.4} fill={fill} opacity={0.18} />
              <circle
                r={radius}
                fill={fill}
                stroke={selected ? "var(--text-1)" : "rgba(5,6,13,0.65)"}
                strokeWidth={selected ? 0.7 : 0.35}
              />
              {token.kind === "minion" && (
                <>
                  <line
                    x1={-radius * 0.62}
                    y1={-radius * 0.62}
                    x2={radius * 0.62}
                    y2={radius * 0.62}
                    stroke="var(--void-950)"
                    strokeWidth="0.85"
                    strokeLinecap="square"
                  />
                  <line
                    x1={radius * 0.62}
                    y1={-radius * 0.62}
                    x2={-radius * 0.62}
                    y2={radius * 0.62}
                    stroke="var(--void-950)"
                    strokeWidth="0.85"
                    strokeLinecap="square"
                  />
                </>
              )}
              {showLabels && token.label && (
                <text
                  y="5.6"
                  textAnchor="middle"
                  fill="var(--text-2)"
                  fontSize="3.1"
                  fontFamily="var(--font-ui)"
                >
                  {token.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>}
      {hover && !blackout && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-[2] min-w-[7.5rem] max-w-[11rem] rounded-[var(--r-md)] border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.94)] px-2 py-1.5 shadow-[var(--glow-cyan)]"
          style={tooltipStyle(hover.x, hover.y)}
        >
          <p className="text-label text-[9px] text-[var(--cyan-400)]">{hover.copy.legend}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-1)]">{hover.copy.detail}</p>
          {hover.copy.name && (
            <p className="mt-0.5 truncate text-[10px] leading-4 text-[var(--text-3)]">{hover.copy.name}</p>
          )}
        </div>
      )}
      {empty && !blackout && (
        <p className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-xs leading-5 text-[var(--text-3)]">
          {emptyCopy}
        </p>
      )}
    </div>
  );
}

function FixtureMark({ fixture, selected }: { fixture: MinimapFixture; selected: boolean }) {
  if (fixture.kind === "door") {
    return (
      <>
        <rect
          x="-5.2"
          y="-1.5"
          width="10.4"
          height="3"
          rx="0.4"
          fill="rgba(251,191,36,0.16)"
          stroke={selected ? "var(--text-1)" : "var(--gold-400)"}
          strokeWidth={selected ? 0.85 : 0.65}
        />
        <line x1="-4.4" y1="0" x2="-2.6" y2="0" stroke="var(--void-950)" strokeWidth="0.7" />
      </>
    );
  }
  if (fixture.kind === "stairs") {
    return (
      <rect
        x="-2.55"
        y="-2.55"
        width="5.1"
        height="5.1"
        fill="var(--text-1)"
        stroke={selected ? "var(--cyan-400)" : "rgba(5,6,13,0.7)"}
        strokeWidth={selected ? 0.75 : 0.4}
      />
    );
  }
  return (
    <polygon
      points="-3.3,-3.3 3.3,-3.3 3.3,3.3 -3.3,3.3"
      fill="rgba(16,19,31,0.88)"
      stroke={selected ? "var(--text-1)" : "var(--cyan-400)"}
      strokeWidth={selected ? 0.9 : 0.7}
    />
  );
}

function tooltipStyle(x: number, y: number) {
  const translateX = x > 0.72 ? "-100%" : x < 0.28 ? "0" : "-50%";
  const translateY = y < 0.22 ? "10px" : "calc(-100% - 8px)";
  return {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    transform: `translate(${translateX}, ${translateY})`,
  };
}
