/**
 * Arte local en `public/crawlers/<slug>/{avatar,full-body}.webp`.
 * El slug es el nombre del crawler en minúsculas (primera palabra).
 * Para un personaje nuevo: crea la carpeta y añade el slug a CRAWLER_ART_SLUGS.
 */

const CRAWLER_ART_SLUGS = new Set(["alberto", "boris", "reifs"]);

const SLUG_ALIASES: Record<string, string> = {
  alverto: "alberto",
};

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

export function crawlerAvatarUrl(name: string, portraitUrl?: string | null): string | null {
  if (portraitUrl) return portraitUrl;
  const slug = crawlerArtSlug(name);
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
