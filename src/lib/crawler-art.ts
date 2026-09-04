/**
 * Arte local en `public/crawlers/<slug>/{avatar,full-body}.webp`.
 * Emociones: `public/crawlers/<slug>/emotions/{alegria,asco,ira,miedo,pensativo,tristeza}.webp`.
 * El slug es el nombre del crawler en minúsculas (primera palabra).
 * Para un personaje nuevo: crea la carpeta y añade el slug a CRAWLER_ART_SLUGS.
 */

const CRAWLER_ART_SLUGS = new Set(["alberto", "boris", "reifs"]);

const SLUG_ALIASES: Record<string, string> = {
  alverto: "alberto",
};

export const AVATAR_EMOTIONS = ["alegria", "asco", "ira", "miedo", "pensativo", "tristeza"] as const;
export type AvatarEmotion = (typeof AVATAR_EMOTIONS)[number];

export const AVATAR_EMOTION_LABEL: Record<AvatarEmotion, string> = {
  alegria: "Alegría",
  asco: "Asco",
  ira: "Ira",
  miedo: "Miedo",
  pensativo: "Pensativo",
  tristeza: "Tristeza",
};

const AVATAR_EMOTION_SET = new Set<string>(AVATAR_EMOTIONS);

export function parseAvatarEmotion(value: unknown): AvatarEmotion | null {
  return typeof value === "string" && AVATAR_EMOTION_SET.has(value)
    ? (value as AvatarEmotion)
    : null;
}

const EMOTION_STORAGE_KEY = "crawler-os:avatar-emotions";

export function crawlerArtSlug(name: string): string | null {
  const raw =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .split(/[\s_/.-]+/)[0]
      ?.replace(/[^a-z0-9]/g, "") ?? "";
  const slug = SLUG_ALIASES[raw] ?? raw;
  return CRAWLER_ART_SLUGS.has(slug) ? slug : null;
}

export function crawlerEmotionUrl(name: string, emotion: AvatarEmotion): string | null {
  const slug = crawlerArtSlug(name);
  return slug ? `/crawlers/${slug}/emotions/${emotion}.webp` : null;
}

export function crawlerAvatarUrl(
  name: string,
  portraitUrl?: string | null,
  emotion?: AvatarEmotion | null
): string | null {
  const slug = crawlerArtSlug(name);
  if (emotion && slug) return `/crawlers/${slug}/emotions/${emotion}.webp`;
  if (portraitUrl) return portraitUrl;
  return slug ? `/crawlers/${slug}/avatar.webp` : null;
}

export function crawlerFullBodyUrl(name: string): string | null {
  const slug = crawlerArtSlug(name);
  return slug ? `/crawlers/${slug}/full-body.webp` : null;
}

export function crawlerInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function readStoredAvatarEmotions(): Partial<Record<string, AvatarEmotion>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(EMOTION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const allowed = new Set<string>(AVATAR_EMOTIONS);
    const next: Partial<Record<string, AvatarEmotion>> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "string" && allowed.has(value)) {
        next[id] = value as AvatarEmotion;
      }
    }
    return next;
  } catch {
    return {};
  }
}

export function writeStoredAvatarEmotions(map: Partial<Record<string, AvatarEmotion>>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EMOTION_STORAGE_KEY, JSON.stringify(map));
}
