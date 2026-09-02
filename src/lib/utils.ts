export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function castSession(data: unknown): import("./types").GameSession | null {
  if (!data || Array.isArray(data)) return null;
  return data as import("./types").GameSession;
}
