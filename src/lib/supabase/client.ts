import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseUrl } from "@/lib/public-supabase";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configured || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Copia .env.example a .env.local o ejecuta npm run setup:local"
    );
  }
  const url = publicSupabaseUrl(configured);
  if (!browserClient) {
    browserClient = createBrowserClient(url, key);
  }
  return browserClient;
}
