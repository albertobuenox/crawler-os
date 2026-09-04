"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SceneChat } from "@/components/hud/SceneChat";

export function DMSceneChat() {
  const supabase = createClient();
  const [sessionId, setSessionId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from("session_members")
        .select("session_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setSessionId(member?.session_id);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!sessionId) return null;
  return <SceneChat sessionId={sessionId} placement="fixed" />;
}
