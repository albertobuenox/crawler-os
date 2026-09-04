export const HOTBAR_SIZE = 10;

/** Visual keys left → right. Slot 0 is "1", slot 9 is "0". */
export const HOTBAR_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

export type HotbarEntry = { kind: "skill" | "item"; id: string };
export type HotbarSlots = (HotbarEntry | null)[];

export function emptyHotbar(): HotbarSlots {
  return Array.from({ length: HOTBAR_SIZE }, () => null);
}

export function hotbarStorageKey(crawlerId: string) {
  return `crawler-os:hotbar:${crawlerId}`;
}

function isEntry(value: unknown): value is HotbarEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as { kind?: unknown; id?: unknown };
  return (v.kind === "skill" || v.kind === "item") && typeof v.id === "string" && v.id.length > 0;
}

export function readHotbar(crawlerId: string): HotbarSlots {
  const slots = emptyHotbar();
  try {
    const raw = window.localStorage.getItem(hotbarStorageKey(crawlerId));
    if (!raw) return slots;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return slots;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      slots[i] = isEntry(parsed[i]) ? parsed[i] : null;
    }
  } catch {
    /* ignore */
  }
  return slots;
}

export function writeHotbar(crawlerId: string, slots: HotbarSlots) {
  try {
    window.localStorage.setItem(hotbarStorageKey(crawlerId), JSON.stringify(slots));
  } catch {
    /* ignore */
  }
}

export function hydrateHotbar(
  stored: HotbarSlots,
  items: { id: string; hotlist_index: number | null }[]
): HotbarSlots {
  const next = stored.slice() as HotbarSlots;
  const used = new Set(
    next.filter((s): s is HotbarEntry => !!s).map((s) => `${s.kind}:${s.id}`)
  );
  for (const item of items) {
    const i = item.hotlist_index;
    if (i == null || i < 0 || i >= HOTBAR_SIZE) continue;
    if (next[i]) continue;
    const key = `item:${item.id}`;
    if (used.has(key)) continue;
    next[i] = { kind: "item", id: item.id };
    used.add(key);
  }
  return next;
}

export function keyToSlotIndex(key: string): number | null {
  const i = HOTBAR_KEYS.indexOf(key as (typeof HOTBAR_KEYS)[number]);
  return i >= 0 ? i : null;
}

export function formatHotbarQty(n: number): string {
  if (n > 9999) return "9999+";
  return String(n);
}

export type HotbarChrome = {
  offsetX: number;
  offsetY: number;
  minimized: boolean;
};

export function hotbarChromeKey(crawlerId: string) {
  return `crawler-os:hotbar-chrome:${crawlerId}`;
}

export function readHotbarChrome(crawlerId: string): HotbarChrome {
  try {
    const raw = window.localStorage.getItem(hotbarChromeKey(crawlerId));
    if (!raw) return { offsetX: 0, offsetY: 0, minimized: false };
    const parsed = JSON.parse(raw) as Partial<HotbarChrome>;
    return {
      offsetX: typeof parsed.offsetX === "number" ? parsed.offsetX : 0,
      offsetY: typeof parsed.offsetY === "number" ? parsed.offsetY : 0,
      minimized: parsed.minimized === true,
    };
  } catch {
    return { offsetX: 0, offsetY: 0, minimized: false };
  }
}

export function writeHotbarChrome(crawlerId: string, chrome: HotbarChrome) {
  try {
    window.localStorage.setItem(hotbarChromeKey(crawlerId), JSON.stringify(chrome));
  } catch {
    /* ignore */
  }
}
