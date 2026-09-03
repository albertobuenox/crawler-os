"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import type { Notification } from "@/lib/types";
import { BRAND } from "@/lib/copy";

export default function DMNotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    setNotifications((data as Notification[]) ?? []);
  }

  return (
    <GlassPanel title={BRAND} subtitle="Historial de notificaciones">
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li key={n.id} className={`well p-3 ${!n.is_read ? "border-[var(--stroke-cyan)]" : ""}`}>
            <p className="font-display text-xs tracking-wider text-[var(--cyan-400)]">{n.title}</p>
            <p className="text-sm text-[var(--text-2)]">{n.body}</p>
          </li>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-[var(--text-3)]">Nada de {BRAND} todavía.</p>
        )}
      </ul>
    </GlassPanel>
  );
}
