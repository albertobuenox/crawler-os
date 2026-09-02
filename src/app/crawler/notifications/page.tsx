"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { CinematicOverlay } from "@/components/hud/CinematicOverlay";
import type { Notification, Rarity } from "@/lib/types";

export default function CrawlerNotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cinematic, setCinematic] = useState<{ open: boolean; n: Notification | null }>({ open: false, n: null });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNotifications((data as Notification[]) ?? []);
  }

  async function ack(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    load();
  }

  return (
    <main className="space-y-4 p-4 pb-24">
      <GlassPanel title="The System">
        {notifications.length === 0 && (
          <p className="text-sm text-[var(--text-3)]">Nada de The System todavía. El dungeon observa.</p>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`mb-2 cursor-pointer well p-3 ${!n.is_read ? "border-[var(--stroke-cyan)]" : ""}`}
            onClick={() => setCinematic({ open: true, n })}
          >
            <p className="font-display text-xs tracking-wider text-[var(--cyan-400)]">{n.title}</p>
            <p className="text-sm">{n.body}</p>
            {!n.is_read && (
              <Button variant="ghost" size="sm" className="mt-2" onClick={(e) => { e.stopPropagation(); ack(n.id); }}>
                Aceptar
              </Button>
            )}
          </div>
        ))}
      </GlassPanel>

      {cinematic.n && (
        <CinematicOverlay
          open={cinematic.open}
          type={cinematic.n.notification_type === "penalty" ? "penalty" : cinematic.n.notification_type === "loot_box" ? "loot_box" : "reward"}
          title={cinematic.n.title}
          body={cinematic.n.body ?? undefined}
          itemName={(cinematic.n.payload as { resource_name?: string })?.resource_name}
          rarity={(cinematic.n.payload as { rarity?: Rarity })?.rarity}
          onClose={() => { setCinematic({ open: false, n: null }); if (cinematic.n) ack(cinematic.n.id); }}
        />
      )}
    </main>
  );
}
