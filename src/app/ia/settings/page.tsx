"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";

export default function IASettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <GlassPanel title="Settings">
      <p className="mb-4 text-sm text-[var(--text-3)]">Theme: System Standard (only)</p>
      <Button variant="danger" onClick={signOut}>Sign Out</Button>
    </GlassPanel>
  );
}
