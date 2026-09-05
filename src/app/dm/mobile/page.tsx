"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { HealthBoxes } from "@/components/hud/HealthBoxes";
import type { Crawler, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/copy";

/** Compact mobile remote for Dungeon Master */
export default function DMMobilePage() {
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
      <GlassPanel title="Dungeon Master — mando móvil" subtitle={session?.name}>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="energy" className="w-full opacity-35" size="sm" disabled>Pedir tirada</Button>
          <Link href="/dm/table"><Button variant="neon" className="w-full" size="sm">Mostrar en Escena</Button></Link>
          <Link href="/dm/world"><Button variant="neon" className="w-full" size="sm">Fase de combate</Button></Link>
          <Link href="/dm/crawlers"><Button variant="session" className="w-full" size="sm">Dar a Mazmorrero</Button></Link>
        </div>
      </GlassPanel>

      <GlassPanel title="HP del grupo">
        {crawlers.map((c) => (
          <div key={c.id} className="mb-3">
            <div className="mb-1 flex justify-between text-sm">
              <span>{c.name}</span>
              <span className="text-[var(--text-3)]">{STATUS_LABEL[c.status]}</span>
            </div>
            <HealthBoxes boxesFilled={c.hp_boxes_filled} conEnhanced={c.con_enhanced} />
          </div>
        ))}
      </GlassPanel>
    </main>
  );
}
