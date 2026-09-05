import { KIND_LABEL, SCENE_LABEL } from "@/lib/copy";
import type { ResourceKind, SessionPhase } from "@/lib/types";

export type CommandGroup = "go" | "create" | "session" | "crawlers" | "resources" | "system";

export const COMMAND_GROUP_LABEL: Record<CommandGroup, string> = {
  go: "Ir a",
  create: "Crear",
  session: "Sesión",
  crawlers: "Crawlers",
  resources: "Recursos",
  system: "Sistema",
};

export const COMMAND_GROUP_ORDER: CommandGroup[] = [
  "go",
  "create",
  "session",
  "crawlers",
  "resources",
  "system",
];

export type CommandIcon =
  | "home"
  | "users"
  | "sparkles"
  | "database"
  | "map"
  | "layout-grid"
  | "scroll"
  | "bell"
  | "settings"
  | "dices"
  | "plus"
  | "tv"
  | "log-out"
  | "swords"
  | "pause"
  | "compass"
  | "copy"
  | "gift"
  | "user"
  | "box"
  | "smartphone";

export type CommandRun =
  | "phase-exploration"
  | "phase-combat"
  | "phase-paused"
  | "create-session"
  | "sign-out"
  | "copy-code";

export type CreateKind = "crawler" | "resource" | "skill";

export type PaletteCommand = {
  id: string;
  group: CommandGroup;
  label: string;
  hint?: string;
  keywords: string[];
  icon: CommandIcon;
  href?: string;
  target?: "_blank";
  createKind?: CreateKind;
  run?: CommandRun;
  disabled?: boolean;
};

export type PaletteContext = {
  session: { id: string; code: string; name: string; phase: SessionPhase } | null;
  crawlers: { id: string; name: string }[];
  resources: { id: string; name: string; kind: ResourceKind }[];
};

export function buildPaletteCommands(ctx: PaletteContext): PaletteCommand[] {
  const commands: PaletteCommand[] = [
    nav("go-session", "Sesión", "/dm", "home", ["dashboard", "control", "inicio", "piso"]),
    nav("go-crawlers", "Crawlers", "/dm/crawlers", "users", ["jugadores", "personajes", "party"]),
    nav("go-skills", "Skills", "/dm/skills", "sparkles", ["habilidades", "catálogo", "d100"]),
    nav("go-resources", "Recursos", "/dm/resources", "database", ["loot", "items", "objetos", "catálogo"]),
    nav("go-world", "Mundo", "/dm/world", "map", ["piso", "combate", "descanso", "fn", "minimapa", "mapa"]),
    nav("go-table", SCENE_LABEL, "/dm/table", "layout-grid", ["mesa", "tv", "pantalla", "proyección"]),
    nav("go-log", "Registro", "/dm/log", "scroll", ["eventos", "log", "historial"]),
    nav("go-notifications", "Sistema", "/dm/notifications", "bell", ["notificaciones", "avisos"]),
    nav("go-settings", "Ajustes", "/dm/settings", "settings", ["config", "cuenta"]),
    nav("go-mobile", "Mando móvil", "/dm/mobile", "smartphone", ["móvil", "remote", "compacto"]),
    {
      id: "go-dice",
      group: "go",
      label: "Dados",
      hint: "No disponible",
      keywords: ["dados", "tirada", "roll"],
      icon: "dices",
      disabled: true,
    },
    {
      id: "create-crawler",
      group: "create",
      label: "Nuevo crawler",
      hint: "Abrir formulario",
      keywords: ["crear", "personaje", "jugador", "nuevo"],
      icon: "plus",
      href: "/dm/crawlers?new=1",
      createKind: "crawler",
    },
    {
      id: "create-resource",
      group: "create",
      label: "Nuevo recurso",
      hint: "Abrir formulario",
      keywords: ["crear", "item", "objeto", "loot", "mapa"],
      icon: "plus",
      href: "/dm/resources?new=1",
      createKind: "resource",
    },
    {
      id: "create-skill",
      group: "create",
      label: "Nueva skill",
      hint: "Abrir formulario",
      keywords: ["crear", "habilidad", "catálogo", "d100"],
      icon: "plus",
      href: "/dm/skills?new=1",
      createKind: "skill",
    },
    {
      id: "go-combat",
      group: "session",
      label: "Combate y descansos",
      hint: "Mundo",
      keywords: ["ronda", "fases", "rest", "loot", "caja"],
      icon: "swords",
      href: "/dm/world#combat",
    },
    {
      id: "go-rest",
      group: "session",
      label: "Aplicar descanso",
      hint: "Mundo",
      keywords: ["rest", "curar", "hp", "maná", "corto", "largo"],
      icon: "compass",
      href: "/dm/world#rest",
    },
    {
      id: "go-loot-box",
      group: "session",
      label: "Crear caja de loot",
      hint: "Mundo",
      keywords: ["caja", "botín", "box"],
      icon: "box",
      href: "/dm/world#loot",
    },
    {
      id: "go-minimap",
      group: "session",
      label: "Minimapa",
      hint: "Mundo",
      keywords: ["minimapa", "mapa", "fichas", "paredes", "enemigos"],
      icon: "map",
      href: "/dm/world#minimap",
    },
    {
      id: "sign-out",
      group: "system",
      label: "Cerrar sesión",
      hint: "Salir",
      keywords: ["logout", "salir", "desconectar"],
      icon: "log-out",
      run: "sign-out",
    },
  ];

  if (!ctx.session) {
    commands.push({
      id: "create-session",
      group: "session",
      label: "Iniciar piso",
      hint: "Crear sesión",
      keywords: ["nueva", "sesión", "empezar", "start"],
      icon: "plus",
      run: "create-session",
    });
    return commands;
  }

  commands.push(
    {
      id: "open-tv",
      group: "go",
      label: `${SCENE_LABEL} TV`,
      hint: ctx.session.code,
      keywords: ["proyector", "pantalla", "mesa", "tv", "externa"],
      icon: "tv",
      href: `/table/${ctx.session.code}`,
      target: "_blank",
    },
    {
      id: "copy-code",
      group: "session",
      label: "Copiar código de sesión",
      hint: ctx.session.code,
      keywords: ["código", "invitar", "join", "copiar", ctx.session.code],
      icon: "copy",
      run: "copy-code",
    },
    {
      id: "phase-exploration",
      group: "session",
      label: "Fase: Exploración",
      hint: "Ejecutar",
      keywords: ["explorar", "fase", "mundo"],
      icon: "compass",
      run: "phase-exploration",
    },
    {
      id: "phase-combat",
      group: "session",
      label: "Fase: Combate",
      hint: "Ejecutar",
      keywords: ["pelea", "fase", "combat"],
      icon: "swords",
      run: "phase-combat",
    },
    {
      id: "phase-paused",
      group: "session",
      label: "Fase: Pausa",
      hint: "Ejecutar",
      keywords: ["pausar", "stop", "fase"],
      icon: "pause",
      run: "phase-paused",
    }
  );

  for (const crawler of ctx.crawlers) {
    const nameKey = crawler.name.toLowerCase();
    commands.push(
      {
        id: `crawler-${crawler.id}`,
        group: "crawlers",
        label: crawler.name,
        hint: "Ficha",
        keywords: [nameKey, "editar", "hoja", "ficha"],
        icon: "user",
        href: `/dm/crawlers/${crawler.id}`,
      },
      {
        id: `crawler-grant-${crawler.id}`,
        group: "crawlers",
        label: `Otorgar a ${crawler.name}`,
        hint: "Loot",
        keywords: [nameKey, "grant", "loot", "dar", "recompensa", "item"],
        icon: "gift",
        href: `/dm/crawlers/${crawler.id}/grant`,
      },
      {
        id: `crawler-skills-${crawler.id}`,
        group: "crawlers",
        label: `Skills de ${crawler.name}`,
        hint: "Habilidades",
        keywords: [nameKey, "habilidades", "skills"],
        icon: "sparkles",
        href: `/dm/crawlers/${crawler.id}/skills`,
      }
    );
  }

  for (const resource of ctx.resources) {
    commands.push({
      id: `resource-${resource.id}`,
      group: "resources",
      label: resource.name,
      hint: KIND_LABEL[resource.kind],
      keywords: [resource.name.toLowerCase(), resource.kind, KIND_LABEL[resource.kind].toLowerCase(), "editar"],
      icon: "database",
      href: `/dm/resources/${resource.id}`,
    });
  }

  return commands;
}

function nav(
  id: string,
  label: string,
  href: string,
  icon: CommandIcon,
  keywords: string[]
): PaletteCommand {
  return {
    id,
    group: "go",
    label,
    hint: "Ir",
    keywords,
    icon,
    href,
  };
}

export function filterPaletteCommands(commands: PaletteCommand[], query: string): PaletteCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return commands;

  const words = q.split(/\s+/).filter(Boolean);

  return commands
    .map((command) => ({ command, score: scoreCommand(command, q, words) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.command);
}

function scoreCommand(command: PaletteCommand, query: string, words: string[]): number {
  const haystack = [command.label, command.hint ?? "", ...command.keywords].join(" ").toLowerCase();
  if (!words.every((word) => haystack.includes(word))) return 0;

  const label = command.label.toLowerCase();
  if (label === query) return 100;
  if (label.startsWith(query)) return 80;
  if (label.includes(query)) return 50;
  if (command.keywords.some((key) => key.toLowerCase().startsWith(query))) return 40;
  return 20;
}

export function groupPaletteCommands(commands: PaletteCommand[]): { group: CommandGroup; items: PaletteCommand[] }[] {
  return COMMAND_GROUP_ORDER.map((group) => ({
    group,
    items: commands.filter((command) => command.group === group),
  })).filter((entry) => entry.items.length > 0);
}
