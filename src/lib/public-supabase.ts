function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** En LAN, el navegador de otra PC no puede hablar con 127.0.0.1 del anfitrión. */
export function publicSupabaseUrl(configured: string): string {
  if (typeof window === "undefined") return configured;
  try {
    const url = new URL(configured);
    if (!isLoopbackHost(url.hostname)) return configured;
    if (isLoopbackHost(window.location.hostname)) return configured;
    url.hostname = window.location.hostname;
    return url.origin;
  } catch {
    return configured;
  }
}
