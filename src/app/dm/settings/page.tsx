"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";

export default function DMSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <GlassPanel title="Ajustes">
      <p className="mb-4 text-sm text-[var(--text-3)]">Tema: Estándar del Sistema (único)</p>
      <Button variant="danger" onClick={signOut}>Cerrar sesión</Button>
    </GlassPanel>
  );
}
