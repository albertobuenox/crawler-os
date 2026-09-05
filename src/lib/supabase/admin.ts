import { createClient } from "@supabase/supabase-js";
import { BRAND } from "@/lib/copy";

export function supabaseUnreachable(err: unknown) {
  if (!(err instanceof Error)) return false;
  const cause = err.cause instanceof Error ? err.cause.message : String(err.cause ?? "");
  const blob = `${err.message} ${cause}`.toLowerCase();
  return (
    blob.includes("fetch failed") ||
    blob.includes("enotfound") ||
    blob.includes("econn") ||
    blob.includes("etimedout") ||
    blob.includes("und_err")
  );
}

export function supabaseReachError(err: unknown, fallback: string) {
  if (supabaseUnreachable(err)) {
    return `${BRAND} no tiene línea con la base. Reinicia el servidor de desarrollo.`;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local (Project Settings → API → service_role)"
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
