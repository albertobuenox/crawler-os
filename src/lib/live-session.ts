export const PRESENCE_STALE_MS = 45_000;

export function isPresenceFresh(lastSeen: string | null | undefined, now = Date.now()) {
  if (!lastSeen) return false;
  const at = Date.parse(lastSeen);
  return Number.isFinite(at) && now - at < PRESENCE_STALE_MS;
}
