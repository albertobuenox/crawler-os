import type { DmChecklistItem, MobType, NotificationType } from "@/lib/types";

export const MASTER_NOTES_TABS = ["notifications", "notes", "checklists", "mobs"] as const;
export type MasterNotesTab = (typeof MASTER_NOTES_TABS)[number];

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  reward: "Reward",
  penalty: "Penalty",
  system: "System Message",
  combat: "Combat",
  roll: "Roll",
  achievement: "Achievement",
  loot_box: "Loot Box",
};

export const NOTIFICATION_TYPES: NotificationType[] = [
  "system",
  "reward",
  "penalty",
  "combat",
  "roll",
  "achievement",
  "loot_box",
];

export const MOB_TYPES: MobType[] = [
  "beast",
  "undead",
  "construct",
  "humanoid",
  "aberration",
  "elemental",
  "vermin",
  "dragon",
  "fiend",
  "plant",
];

export const MOB_TYPE_LABEL: Record<MobType, string> = {
  beast: "Bestia",
  undead: "No-muerto",
  construct: "Constructo",
  humanoid: "Humanoide",
  aberration: "Aberración",
  elemental: "Elemental",
  vermin: "Alimaña",
  dragon: "Dragón",
  fiend: "Demonio",
  plant: "Planta",
};

export function defaultMobSprite(type: MobType | string | null | undefined): string {
  const key = MOB_TYPES.includes(type as MobType) ? (type as MobType) : "beast";
  return `/mobs/${key}.svg`;
}

export function isMobType(value: string): value is MobType {
  return MOB_TYPES.includes(value as MobType);
}

export function parseChecklistItems(raw: unknown): DmChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const text = typeof item.text === "string" ? item.text : "";
      if (!text.trim() && typeof item.id !== "string") return null;
      return {
        id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
        text,
        done: item.done === true,
      } satisfies DmChecklistItem;
    })
    .filter((item): item is DmChecklistItem => !!item);
}

export function checklistProgress(items: DmChecklistItem[]) {
  const total = items.length;
  const done = items.filter((item) => item.done).length;
  return { done, total, ratio: total === 0 ? 0 : done / total };
}

export function newChecklistItem(text = ""): DmChecklistItem {
  return { id: crypto.randomUUID(), text, done: false };
}

export function parseMasterTab(value: string | null | undefined): MasterNotesTab {
  if (value && MASTER_NOTES_TABS.includes(value as MasterNotesTab)) {
    return value as MasterNotesTab;
  }
  return "notifications";
}
