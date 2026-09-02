import type { CrawlerStatus, ResourceKind, Rarity, SessionPhase } from "./types";

export const STATUS_LABEL: Record<CrawlerStatus, string> = {
  exploring: "Explorando",
  combat: "Combate",
  downed: "Caído",
  dead: "Muerto",
  afk: "Ausente",
};

export const KIND_LABEL: Record<ResourceKind, string> = {
  item: "Objeto",
  achievement: "Logro",
  map: "Mapa",
  monster: "Monstruo",
  npc: "PNJ",
  box: "Caja",
  buff: "Mejora",
  debuff: "Perjuicio",
  quest: "Misión",
  floor: "Piso",
  skill_template: "Plantilla de habilidad",
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Común",
  uncommon: "Poco común",
  rare: "Raro",
  epic: "Épico",
  legendary: "Legendario",
  celestial: "Celestial",
};

export const SKILL_TYPE_LABEL: Record<string, string> = {
  attack: "Ataque",
  spell: "Conjuro",
  utility: "Utilidad",
  passive: "Pasiva",
};

export const PHASE_LABEL: Record<SessionPhase, string> = {
  exploration: "Exploración",
  combat_1: "Combate 1",
  combat_2: "Combate 2",
  combat_3: "Combate 3",
  combat_4: "Combate 4",
  combat_5: "Combate 5",
  rest: "Descanso",
  paused: "Pausa",
};

export const EFFECT_KIND_LABEL: Record<string, string> = {
  internal: "interno",
  external: "externo",
  debuff: "perjuicio",
};

export const DICE_STATUS_LABEL: Record<string, string> = {
  pending: "pendiente",
  rolled: "tirado",
  cancelled: "cancelado",
};

export function kindOptions(kinds: ResourceKind[]) {
  return kinds.map((k) => ({ value: k, label: KIND_LABEL[k] }));
}

export function rarityOptions(rarities: Rarity[]) {
  return rarities.map((r) => ({ value: r, label: RARITY_LABEL[r] }));
}

export function authErrorEs(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("database error saving new user")) {
    return "Error de base de datos al guardar el crawler. El perfil no se pudo crear.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Este crawler ya está registrado. Entra.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Acceso denegado. The System no reconoce a este crawler.";
  }
  if (m.includes("password")) {
    return "La contraseña no cumple los requisitos de The System.";
  }
  return message;
}
