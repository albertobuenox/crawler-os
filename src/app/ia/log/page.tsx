"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { EventLogList } from "@/components/hud/EventLog";
import type { EventLogEntry, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";

export default function IALogPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<EventLogEntry[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase.from("session_members").select("sessions(id)").eq("user_id", user.id).limit(1).maybeSingle();
      const sess = castSession(member?.sessions);
      if (sess) {
        const { data } = await supabase.from("event_log").select("*").eq("session_id", sess.id).order("created_at", { ascending: false }).limit(100);
        setEvents((data as EventLogEntry[]) ?? []);
      }
    })();
  }, [supabase]);

  return (
    <GlassPanel title="Event Log" subtitle="Global — La IA view">
      <EventLogList entries={events} />
    </GlassPanel>
  );
}
