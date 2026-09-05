"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Box,
  Compass,
  Copy,
  Database,
  Dices,
  Gift,
  Home,
  LayoutGrid,
  LogOut,
  Map,
  Pause,
  Plus,
  ScrollText,
  Search,
  Settings,
  Smartphone,
  Sparkles,
  WandSparkles,
  Swords,
  Tv,
  User,
  Users,
  StickyNote,
  Skull,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { castSession, cn } from "@/lib/utils";
import { requestCreate } from "@/hooks/useDmDeepLink";
import {
  COMMAND_GROUP_LABEL,
  buildPaletteCommands,
  filterPaletteCommands,
  groupPaletteCommands,
  type CommandIcon,
  type CommandRun,
  type PaletteCommand,
  type PaletteContext,
} from "@/lib/command-palette";
import type { ResourceKind } from "@/lib/types";

const ICONS: Record<CommandIcon, LucideIcon> = {
  home: Home,
  users: Users,
  sparkles: Sparkles,
  wand: WandSparkles,
  database: Database,
  map: Map,
  "layout-grid": LayoutGrid,
  scroll: ScrollText,
  bell: Bell,
  settings: Settings,
  dices: Dices,
  plus: Plus,
  tv: Tv,
  "log-out": LogOut,
  swords: Swords,
  pause: Pause,
  compass: Compass,
  copy: Copy,
  gift: Gift,
  user: User,
  box: Box,
  smartphone: Smartphone,
  "sticky-note": StickyNote,
  skull: Skull,
  list: ListChecks,
};

const CommandPaletteContext = createContext<{ open: () => void }>({ open: () => {} });

export function useCommandPalette() {
  return useContext(CommandPaletteContext);
}

export function CommandPaletteRoot({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openPalette = useCallback(() => setOpen(true), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.shiftKey || !(event.ctrlKey || event.metaKey)) return;
      if (event.code !== "KeyP" || event.repeat) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <CommandPaletteContext.Provider value={{ open: openPalette }}>
      {children}
      <CommandPaletteDialog open={open} onOpenChange={setOpen} />
    </CommandPaletteContext.Provider>
  );
}

export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { open } = useCommandPalette();
  const [label, setLabel] = useState("Ctrl+Shift+P");

  useEffect(() => {
    setLabel(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘⇧P" : "Ctrl+Shift+P");
  }, []);

  return (
    <button
      type="button"
      onClick={open}
      aria-keyshortcuts="Control+Shift+P Meta+Shift+P"
      aria-label="Abrir paleta de acciones"
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.72)] px-3 text-[var(--text-3)] transition-colors duration-[var(--t-ui)] hover:border-[var(--stroke-cyan-hot)] hover:text-[var(--text-1)]",
        className
      )}
    >
      <Search size={14} strokeWidth={1.75} />
      <span className="hidden text-xs font-medium tracking-wide sm:inline">Acciones</span>
      <kbd className="hidden rounded-md border border-[var(--stroke-glass)] bg-[rgba(16,19,31,0.9)] px-1.5 py-0.5 font-mono-system text-[10px] text-[var(--text-4)] lg:inline">
        {label}
      </kbd>
    </button>
  );
}

function CommandPaletteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [commands, setCommands] = useState<PaletteCommand[]>([]);
  const contextRef = useRef<PaletteContext>({ session: null, crawlers: [], resources: [] });

  const filtered = useMemo(() => filterPaletteCommands(commands, query), [commands, query]);
  const groups = useMemo(() => groupPaletteCommands(filtered), [filtered]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  const close = useCallback(() => {
    onOpenChange(false);
    setQuery("");
    setActiveIndex(0);
  }, [onOpenChange]);

  const runCommand = useCallback(
    async (command: PaletteCommand) => {
      if (command.disabled) return;
      close();

      if (command.createKind) {
        const dest = command.href?.split("?")[0] ?? "";
        if (pathname === dest) {
          requestCreate(command.createKind);
          return;
        }
      }

      if (command.run) {
        await executeRun(command.run, contextRef.current, router);
        return;
      }

      if (!command.href) return;
      if (command.target === "_blank") {
        window.open(command.href, "_blank", "noopener,noreferrer");
        return;
      }

      const [path, hash] = command.href.split("#");
      if (hash && pathname === path) {
        window.history.replaceState(null, "", command.href);
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      router.push(command.href);
    },
    [close, pathname, router]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const next = await loadPaletteContext();
      if (cancelled) return;
      contextRef.current = next;
      setCommands(buildPaletteCommands(next));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, commands]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, flat]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        setActiveIndex(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        setActiveIndex(Math.max(0, flat.length - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const command = flat[activeIndex];
        if (command) void runCommand(command);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, activeIndex, close, runCommand]);

  let walkingIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-[rgba(5,6,13,0.72)] px-4 pt-[12vh] backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            initial={{ scale: 0.96, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: 8, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
            className="glass w-full max-w-xl overflow-hidden border-[var(--stroke-cyan)] p-0 shadow-[var(--glow-cyan)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[var(--stroke-glass)] px-4 pb-3 pt-4">
              <p
                id="command-palette-title"
                className="mb-3 font-display text-[10px] tracking-[var(--ls-system)] text-[var(--cyan-400)]"
              >
                PALETA DE MANDO
              </p>
              <div className="flex items-center gap-3">
                <Search size={16} className="shrink-0 text-[var(--cyan-400)]" />
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar acción, crawler o recurso…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-autocomplete="list"
                  aria-controls="command-palette-list"
                  className="h-10 w-full bg-transparent text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)]"
                />
              </div>
            </div>

            <div
              ref={listRef}
              id="command-palette-list"
              role="listbox"
              className="max-h-[min(420px,52vh)] overflow-y-auto px-2 py-2"
            >
              {loading && commands.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-[var(--text-3)]">Cargando acciones…</p>
              )}
              {!loading && flat.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-[var(--text-3)]">
                  Nada coincide con “{query}”.
                </p>
              )}
              {groups.map((group) => (
                <div key={group.group} className="mb-1">
                  <p className="px-3 py-1.5 text-label text-[var(--text-4)]">
                    {COMMAND_GROUP_LABEL[group.group]}
                  </p>
                  {group.items.map((command) => {
                    walkingIndex += 1;
                    const index = walkingIndex;
                    const Icon = ICONS[command.icon];
                    const active = index === activeIndex;
                    return (
                      <button
                        key={command.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-index={index}
                        disabled={command.disabled}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => void runCommand(command)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors duration-[var(--t-micro)]",
                          command.disabled && "cursor-default opacity-40",
                          active && !command.disabled
                            ? "well text-[var(--cyan-400)] shadow-[var(--glow-cyan)]"
                            : "text-[var(--text-1)] hover:bg-[rgba(255,255,255,0.04)]"
                        )}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[rgba(255,255,255,0.04)]">
                          <Icon size={15} strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{command.label}</span>
                        {command.hint && (
                          <span className="shrink-0 font-mono-system text-[10px] uppercase tracking-wider text-[var(--text-4)]">
                            {command.hint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--stroke-glass)] px-4 py-2.5 text-[10px] text-[var(--text-4)]">
              <span>
                <kbd className="font-mono-system text-[var(--text-3)]">↑↓</kbd> navegar
              </span>
              <span>
                <kbd className="font-mono-system text-[var(--text-3)]">↵</kbd> ir / ejecutar
              </span>
              <span>
                <kbd className="font-mono-system text-[var(--text-3)]">Esc</kbd> cerrar
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

async function loadPaletteContext(): Promise<PaletteContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { session: null, crawlers: [], resources: [] };

  const { data: member } = await supabase
    .from("session_members")
    .select("sessions(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = castSession(member?.sessions);
  if (!session) return { session: null, crawlers: [], resources: [] };

  const [{ data: crawlers }, { data: resources }] = await Promise.all([
    supabase.from("crawlers").select("id, name").eq("session_id", session.id).order("name"),
    supabase.from("resources").select("id, name, kind").eq("session_id", session.id).order("name"),
  ]);

  return {
    session: {
      id: session.id,
      code: session.code,
      name: session.name,
      phase: session.phase,
    },
    crawlers: (crawlers as { id: string; name: string }[]) ?? [],
    resources: (resources as { id: string; name: string; kind: ResourceKind }[]) ?? [],
  };
}

async function executeRun(
  run: CommandRun,
  ctx: PaletteContext,
  router: ReturnType<typeof useRouter>
) {
  const supabase = createClient();

  if (run === "sign-out") {
    await supabase.auth.signOut();
    window.location.assign("/login");
    return;
  }

  if (run === "create-session") {
    await supabase.rpc("create_game_session", { p_name: "Sesión de piso" });
    router.push("/dm");
    router.refresh();
    return;
  }

  if (run === "copy-code" && ctx.session) {
    await navigator.clipboard.writeText(ctx.session.code);
    return;
  }

  if (!ctx.session) return;

  const phase =
    run === "phase-exploration" ? "exploration" : run === "phase-combat" ? "combat_1" : "paused";
  await supabase.from("sessions").update({ phase }).eq("id", ctx.session.id);
  router.push("/dm");
  router.refresh();
}
