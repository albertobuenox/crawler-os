"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Bot,
  DoorOpen,
  Eraser,
  Minus,
  MousePointer2,
  PawPrint,
  Pencil,
  RotateCw,
  Skull,
  Square,
  Trash2,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { MinimapCanvas, clientToMinimapPoint } from "@/components/hud/MinimapCanvas";
import { useMinimap } from "@/hooks/useMinimap";
import {
  eraseAt,
  hitTestMinimap,
  makeFixture,
  makeStroke,
  makeToken,
  MINIMAP_DOT,
  MINIMAP_FIXTURE_KINDS,
  MINIMAP_FIXTURE_LABEL,
  MINIMAP_TOKEN_KINDS,
  MINIMAP_TOKEN_LABEL,
  placePartyTokens,
  sanitizeLabel,
  simplifyPoints,
} from "@/lib/minimap";
import { MINIMAP_LABEL } from "@/lib/copy";
import type {
  MinimapDoc,
  MinimapFixtureKind,
  MinimapPoint,
  MinimapStroke,
  MinimapTokenKind,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type Tool = "select" | "draw" | "wall" | "erase";
type Stamp =
  | { type: "token"; kind: MinimapTokenKind }
  | { type: "fixture"; kind: MinimapFixtureKind };

type CrawlerOpt = { id: string; name: string };

export function MinimapEditor({
  sessionId,
  crawlers,
}: {
  sessionId: string;
  crawlers: CrawlerOpt[];
}) {
  const { doc, ready, error, commit, setBusy } = useMinimap(sessionId, { ensure: true });
  const [tool, setTool] = useState<Tool>("select");
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftStroke, setDraftStroke] = useState<MinimapStroke | null>(null);
  const [ghost, setGhost] = useState<{ stamp: Stamp; x: number; y: number } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef(doc);
  mapRef.current = doc;
  const dragRef = useRef<{
    mode: "draw" | "wall" | "move-token" | "move-fixture";
    id?: string;
    origin?: MinimapPoint;
    start?: MinimapPoint;
  } | null>(null);

  useEffect(() => {
    if (!confirmClear) return;
    const t = window.setTimeout(() => setConfirmClear(false), 2800);
    return () => window.clearTimeout(t);
  }, [confirmClear]);

  const map = doc;

  function apply(next: MinimapDoc, immediate = false) {
    mapRef.current = next;
    commit(next, immediate);
  }

  function liveDoc() {
    return mapRef.current;
  }

  function placeStamp(point: MinimapPoint, current: Stamp, currentDoc: MinimapDoc) {
    if (current.type === "token") {
      const token = makeToken(current.kind, point.x, point.y);
      apply({ ...currentDoc, tokens: [...currentDoc.tokens, token] }, true);
      setSelectedId(token.id);
      return;
    }
    const fixture = makeFixture(current.kind, point.x, point.y);
    apply({ ...currentDoc, fixtures: [...currentDoc.fixtures, fixture] }, true);
    setSelectedId(fixture.id);
  }

  function onCanvasDown(event: ReactPointerEvent<HTMLDivElement>, point: MinimapPoint) {
    const current = liveDoc();
    if (!current) return;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (stamp) {
      const hit = hitTestMinimap(current, point);
      if (hit?.type === "token") {
        setSelectedId(hit.id);
        setStamp(null);
        setTool("select");
        return;
      }
      placeStamp(point, stamp, current);
      return;
    }

    if (tool === "erase") {
      apply(eraseAt(current, point), true);
      setSelectedId(null);
      return;
    }

    if (tool === "draw") {
      setBusy(true);
      dragRef.current = { mode: "draw" };
      setDraftStroke(makeStroke("draw", [point]));
      return;
    }

    if (tool === "wall") {
      setBusy(true);
      dragRef.current = { mode: "wall", start: point };
      setDraftStroke(makeStroke("wall", [point, point]));
      return;
    }

    const hit = hitTestMinimap(current, point);
    if (hit?.type === "token" || hit?.type === "fixture") {
      setSelectedId(hit.id);
      setBusy(true);
      dragRef.current = {
        mode: hit.type === "token" ? "move-token" : "move-fixture",
        id: hit.id,
        origin: point,
      };
      return;
    }
    setSelectedId(null);
  }

  function onCanvasMove(_event: ReactPointerEvent<HTMLDivElement>, point: MinimapPoint) {
    const current = liveDoc();
    if (!current) return;
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "draw") {
      setDraftStroke((prev) =>
        prev ? { ...prev, points: simplifyPoints([...prev.points, point]) } : prev
      );
      return;
    }
    if (drag.mode === "wall" && drag.start) {
      setDraftStroke(makeStroke("wall", [drag.start, point]));
      return;
    }
    if (drag.mode === "move-token" && drag.id) {
      apply({
        ...current,
        tokens: current.tokens.map((t) => (t.id === drag.id ? { ...t, x: point.x, y: point.y } : t)),
      });
      return;
    }
    if (drag.mode === "move-fixture" && drag.id) {
      apply({
        ...current,
        fixtures: current.fixtures.map((f) => (f.id === drag.id ? { ...f, x: point.x, y: point.y } : f)),
      });
    }
  }

  function onCanvasUp(event: ReactPointerEvent<HTMLDivElement>, point: MinimapPoint) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const drag = dragRef.current;
    dragRef.current = null;
    setBusy(false);
    const current = liveDoc();
    if (!current) {
      setDraftStroke(null);
      return;
    }
    if (drag?.mode === "draw" || drag?.mode === "wall") {
      const stroke = draftStroke;
      setDraftStroke(null);
      const points = stroke?.points ?? [point];
      if (points.length < 2 && drag.mode === "draw") return;
      apply({ ...current, strokes: [...current.strokes, makeStroke(drag.mode, points)] }, true);
      return;
    }
    if (drag?.mode === "move-token" && drag.id) {
      apply(
        {
          ...current,
          tokens: current.tokens.map((t) => (t.id === drag.id ? { ...t, x: point.x, y: point.y } : t)),
        },
        true
      );
      return;
    }
    if (drag?.mode === "move-fixture" && drag.id) {
      apply(
        {
          ...current,
          fixtures: current.fixtures.map((f) => (f.id === drag.id ? { ...f, x: point.x, y: point.y } : f)),
        },
        true
      );
    }
  }

  function onPalettePointerDown(event: ReactPointerEvent<HTMLButtonElement>, next: Stamp) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setTool("select");
    setStamp(next);
    setGhost({ stamp: next, x: event.clientX, y: event.clientY });
  }

  function onPalettePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!ghost) return;
    setGhost({ ...ghost, x: event.clientX, y: event.clientY });
  }

  function onPalettePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const wrap = canvasWrapRef.current;
    const current = ghost?.stamp ?? stamp;
    const currentDoc = liveDoc();
    setGhost(null);
    if (!wrap || !currentDoc || !current) return;
    const rect = wrap.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (inside) {
      placeStamp(clientToMinimapPoint(event, wrap), current, currentDoc);
    }
  }

  function updateSelectedToken(patch: Partial<{ kind: MinimapTokenKind; label: string; crawler_id: string | null }>) {
    const current = liveDoc();
    if (!current || !selectedId) return;
    apply(
      {
        ...current,
        tokens: current.tokens.map((t) => {
          if (t.id !== selectedId) return t;
          const next = { ...t, ...patch };
          if (patch.crawler_id) {
            const crawler = crawlers.find((c) => c.id === patch.crawler_id);
            if (crawler && !patch.label) next.label = crawler.name;
          }
          if (patch.kind && patch.kind !== "player") next.crawler_id = null;
          if (patch.label !== undefined) next.label = sanitizeLabel(patch.label);
          return next;
        }),
      },
      true
    );
  }

  function updateSelectedFixture(patch: Partial<{ kind: MinimapFixtureKind }>) {
    const current = liveDoc();
    if (!current || !selectedId) return;
    apply(
      {
        ...current,
        fixtures: current.fixtures.map((f) => (f.id === selectedId ? { ...f, ...patch } : f)),
      },
      true
    );
  }

  function rotateSelected() {
    const current = liveDoc();
    if (!current || !selectedId) return;
    apply(
      {
        ...current,
        fixtures: current.fixtures.map((f) =>
          f.id === selectedId ? { ...f, rotation: (f.rotation + 90) % 360 } : f
        ),
      },
      true
    );
  }

  function removeSelected() {
    const current = liveDoc();
    if (!current || !selectedId) return;
    apply(
      {
        ...current,
        tokens: current.tokens.filter((t) => t.id !== selectedId),
        fixtures: current.fixtures.filter((f) => f.id !== selectedId),
      },
      true
    );
    setSelectedId(null);
  }

  const selectedToken = map?.tokens.find((t) => t.id === selectedId) ?? null;
  const selectedFixture = map?.fixtures.find((f) => f.id === selectedId) ?? null;

  return (
    <GlassPanel
      id="minimap"
      className="scroll-mt-8"
      title={MINIMAP_LABEL}
      subtitle="Lo que pintas aquí lo ven los crawlers en Escena. Ellos no tocan."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToolButton
          label="Mover"
          active={tool === "select" && !stamp}
          onClick={() => {
            setTool("select");
            setStamp(null);
          }}
        >
          <MousePointer2 size={15} />
        </ToolButton>
        <ToolButton
          label="Pintar"
          active={tool === "draw"}
          onClick={() => {
            setTool("draw");
            setStamp(null);
            setSelectedId(null);
          }}
        >
          <Pencil size={15} />
        </ToolButton>
        <ToolButton
          label="Pared"
          active={tool === "wall"}
          onClick={() => {
            setTool("wall");
            setStamp(null);
            setSelectedId(null);
          }}
        >
          <Minus size={15} />
        </ToolButton>
        <ToolButton
          label="Borrar"
          active={tool === "erase"}
          onClick={() => {
            setTool("erase");
            setStamp(null);
            setSelectedId(null);
          }}
        >
          <Eraser size={15} />
        </ToolButton>
        <span className="mx-1 h-6 w-px bg-[var(--stroke-glass)]" />
        <StampChip
          label="Mazmorrero"
          swatch={MINIMAP_DOT.ally}
          active={stamp?.type === "token" && stamp.kind === "player"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "token", kind: "player" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <User size={14} />
        </StampChip>
        <StampChip
          label="NPC"
          swatch={MINIMAP_DOT.npc}
          active={stamp?.type === "token" && stamp.kind === "npc"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "token", kind: "npc" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <UserRound size={14} />
        </StampChip>
        <StampChip
          label="Hostil"
          swatch={MINIMAP_DOT.enemy}
          active={stamp?.type === "token" && stamp.kind === "enemy"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "token", kind: "enemy" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <Skull size={14} />
        </StampChip>
        <StampChip
          label="Mascota"
          swatch={MINIMAP_DOT.pet}
          active={stamp?.type === "token" && stamp.kind === "pet"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "token", kind: "pet" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <PawPrint size={14} />
        </StampChip>
        <StampChip
          label="Minión"
          swatch={MINIMAP_DOT.minion}
          mark="x"
          active={stamp?.type === "token" && stamp.kind === "minion"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "token", kind: "minion" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <Bot size={14} />
        </StampChip>
        <StampChip
          label="Escaleras"
          swatch={MINIMAP_DOT.npc}
          mark="square"
          active={stamp?.type === "fixture" && stamp.kind === "stairs"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "fixture", kind: "stairs" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <Square size={14} />
        </StampChip>
        <StampChip
          label="Puerta"
          active={stamp?.type === "fixture" && stamp.kind === "door"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "fixture", kind: "door" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <DoorOpen size={14} />
        </StampChip>
        <StampChip
          label="Obstáculo"
          active={stamp?.type === "fixture" && stamp.kind === "obstacle"}
          onPointerDown={(e) => onPalettePointerDown(e, { type: "fixture", kind: "obstacle" })}
          onPointerMove={onPalettePointerMove}
          onPointerUp={onPalettePointerUp}
        >
          <Square size={14} />
        </StampChip>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div ref={canvasWrapRef} className="mx-auto min-w-0 w-full max-w-[620px]">
          {map && ready ? (
            <MinimapCanvas
              doc={map}
              viewer="dm"
              selectedId={selectedId}
              draftStroke={draftStroke}
              interactive
              showLabels
              onPointerDown={onCanvasDown}
              onPointerMove={onCanvasMove}
              onPointerUp={onCanvasUp}
            />
          ) : (
            <div className="well aspect-square animate-pulse" />
          )}
        </div>

        <div className="space-y-3">
          {selectedToken ? (
            <div className="well space-y-3 p-3">
              <p className="text-label">Ficha</p>
              <div className="grid grid-cols-2 gap-1">
                {MINIMAP_TOKEN_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => updateSelectedToken({ kind })}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-[var(--r-sm)] border px-1 py-1.5 text-[10px] uppercase tracking-wider",
                      selectedToken.kind === kind
                        ? KIND_TONE[kind]
                        : "border-[var(--stroke-glass)] text-[var(--text-3)]"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="relative inline-flex h-2 w-2 shrink-0 items-center justify-center rounded-full"
                      style={{ background: tokenSwatch(kind) }}
                    >
                      {kind === "minion" && (
                        <span className="absolute inset-0 text-[7px] leading-none text-[var(--void-950)]">×</span>
                      )}
                    </span>
                    {MINIMAP_TOKEN_LABEL[kind]}
                  </button>
                ))}
              </div>
              <Input
                label="Nombre"
                value={selectedToken.label}
                onChange={(e) => updateSelectedToken({ label: e.target.value })}
              />
              {selectedToken.kind === "player" && (
                <>
                  <Select
                    label="Crawler"
                    value={selectedToken.crawler_id ?? ""}
                    onChange={(e) =>
                      updateSelectedToken({ crawler_id: e.target.value || null })
                    }
                    options={[
                      { value: "", label: "Sin vincular" },
                      ...crawlers.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                  <p className="text-[10px] leading-4 text-[var(--text-4)]">
                    El crawler vinculado ve este punto en verde: tú. El resto lo ve azul.
                  </p>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={removeSelected}>
                <Trash2 size={14} /> Quitar ficha
              </Button>
            </div>
          ) : selectedFixture ? (
            <div className="well space-y-3 p-3">
              <p className="text-label">{MINIMAP_FIXTURE_LABEL[selectedFixture.kind]}</p>
              <div className="grid grid-cols-3 gap-1">
                {MINIMAP_FIXTURE_KINDS.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => updateSelectedFixture({ kind })}
                    className={cn(
                      "rounded-[var(--r-sm)] border px-1 py-1.5 text-[10px] uppercase tracking-wider",
                      selectedFixture.kind === kind
                        ? "border-[var(--stroke-cyan)] text-[var(--cyan-400)]"
                        : "border-[var(--stroke-glass)] text-[var(--text-3)]"
                    )}
                  >
                    {MINIMAP_FIXTURE_LABEL[kind]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="neon" size="sm" onClick={rotateSelected}>
                  <RotateCw size={14} /> Girar
                </Button>
                <Button variant="ghost" size="sm" onClick={removeSelected}>
                  <Trash2 size={14} /> Quitar
                </Button>
              </div>
            </div>
          ) : (
            <div className="well space-y-2 p-3 text-xs leading-5 text-[var(--text-3)]">
              <p>Arrastra fichas o escaleras al mapa. Pasa el cursor por un punto para leer su leyenda.</p>
              <p>Rojo hostil · blanco NPC · naranja mascota · azul mazmorrero · verde tú · verde+X minión · cuadrado blanco escaleras.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="neon"
              size="sm"
              disabled={!map}
              onClick={() => {
                if (!map) return;
                apply(placePartyTokens(map, crawlers), true);
              }}
            >
              <Users size={14} /> Colocar party
            </Button>
            <Button
              variant={confirmClear ? "danger" : "ghost"}
              size="sm"
              disabled={!map}
              onClick={() => {
                if (!map) return;
                if (!confirmClear) {
                  setConfirmClear(true);
                  return;
                }
                apply({ ...map, tokens: [], strokes: [], fixtures: [] }, true);
                setSelectedId(null);
                setConfirmClear(false);
              }}
            >
              {confirmClear ? "Confirmar vacío" : "Vaciar mapa"}
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}
      {ghost && (
        <div
          className="pointer-events-none fixed z-[var(--z-modal)] rounded-full border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.8)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--cyan-400)]"
          style={{ left: ghost.x + 12, top: ghost.y + 12 }}
        >
          {ghost.stamp.type === "token"
            ? MINIMAP_TOKEN_LABEL[ghost.stamp.kind]
            : MINIMAP_FIXTURE_LABEL[ghost.stamp.kind]}
        </div>
      )}
    </GlassPanel>
  );
}

const KIND_TONE: Record<MinimapTokenKind, string> = {
  player: "border-[var(--mana)] text-[var(--mana)]",
  npc: "border-[var(--stroke-glass)] text-[var(--text-1)]",
  enemy: "border-[var(--stroke-danger)] text-[var(--danger)]",
  pet: "border-[var(--stroke-reward)] text-[var(--orange-400)]",
  minion: "border-[var(--ok)] text-[var(--ok)]",
};

function tokenSwatch(kind: MinimapTokenKind) {
  if (kind === "enemy") return MINIMAP_DOT.enemy;
  if (kind === "npc") return MINIMAP_DOT.npc;
  if (kind === "pet") return MINIMAP_DOT.pet;
  if (kind === "minion") return MINIMAP_DOT.minion;
  return MINIMAP_DOT.ally;
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-[var(--r-md)] border px-2.5 text-[11px] uppercase tracking-wider transition-all duration-[var(--t-ui)]",
        active
          ? "border-[var(--stroke-cyan-hot)] bg-[rgba(0,212,255,0.1)] text-[var(--cyan-400)] shadow-[var(--glow-cyan)]"
          : "border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.55)] text-[var(--text-3)] hover:border-[var(--stroke-cyan)] hover:text-[var(--cyan-400)]"
      )}
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StampChip({
  label,
  active,
  swatch,
  mark,
  children,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  label: string;
  active?: boolean;
  swatch?: string;
  mark?: "x" | "square";
  children: React.ReactNode;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      title={`Arrastrar ${label}`}
      aria-pressed={active}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        "inline-flex h-9 cursor-grab items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5 text-[11px] uppercase tracking-wider touch-none",
        active
          ? "border-[var(--stroke-cyan)] text-[var(--cyan-400)]"
          : "border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--stroke-cyan)]"
      )}
    >
      {swatch ? (
        <span
          aria-hidden="true"
          className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center"
          style={{
            background: swatch,
            borderRadius: mark === "square" ? 1 : 999,
          }}
        >
          {mark === "x" && (
            <span className="absolute text-[8px] leading-none text-[var(--void-950)]">×</span>
          )}
        </span>
      ) : (
        children
      )}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
