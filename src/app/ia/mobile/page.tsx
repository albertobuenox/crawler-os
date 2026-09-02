"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { ResourceBar } from "@/components/hud/HealthBoxes";
import type { Crawler, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";

/** Compact mobile remote for La IA */
export default function IAMobilePage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase.from("session_members").select("sessions(*)").eq("user_id", user.id).limit(1).maybeSingle();
      const sess = castSession(member?.sessions);
      setSession(sess ?? null);
      if (sess) {
        const { data } = await supabase.from("crawlers").select("*").eq("session_id", sess.id);
        setCrawlers((data as Crawler[]) ?? []);
      }
    })();
  }, [supabase]);

  return (
    <main className="space-y-4 p-4 lg:hidden">
      <GlassPanel title="La IA — Mobile Remote" subtitle={session?.code}>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/ia/dice"><Button variant="energy" className="w-full" size="sm">Request Roll</Button></Link>
          <Link href="/ia/table"><Button variant="neon" className="w-full" size="sm">Show on Mesa</Button></Link>
          <Link href="/ia/world"><Button variant="neon" className="w-full" size="sm">Combat Phase</Button></Link>
          <Link href="/ia/crawlers"><Button variant="session" className="w-full" size="sm">Grant Loot</Button></Link>
        </div>
      </GlassPanel>

      <GlassPanel title="Party HP">
        {crawlers.map((c) => (
          <div key={c.id} className="mb-3">
            <div className="mb-1 flex justify-between text-sm">
              <span>{c.name}</span>
              <span className="capitalize text-[var(--text-3)]">{c.status}</span>
            </div>
            <ResourceBar
              label="HP boxes remaining"
              current={10 - c.hp_boxes_filled}
              max={10}
              color="var(--hp)"
            />
          </div>
        ))}
      </GlassPanel>
    </main>
  );
}
