"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";

export default function CrawlerSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="p-4 pb-24">
      <GlassPanel title="Settings">
        <p className="mb-2 text-sm text-[var(--text-3)]">Add to Home Screen for full HUD experience.</p>
        <Button variant="danger" onClick={signOut}>Sign Out</Button>
      </GlassPanel>
    </main>
  );
}
