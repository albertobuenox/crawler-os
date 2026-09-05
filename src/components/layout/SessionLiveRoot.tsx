"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { MASTER_CHAT_NAME } from "@/lib/copy";
import { fetchActiveMembership } from "@/hooks/useSession";
import {
  retainSessionBus,
  trackSessionPresence,
  type SessionPresenceMeta,
} from "@/lib/session-bus";
import type { UserRole } from "@/lib/types";

const HEARTBEAT_MS = 15_000;

export function SessionLiveRoot({
  role,
  children,
}: {
  role: UserRole;
  children: ReactNode;
}) {
  const supabase = createClient();
  const [live, setLive] = useState<{ sessionId: string; meta: SessionPresenceMeta } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", user.id)
        .maybeSingle();
      const resolvedRole: UserRole = profile?.role === "dm" || role === "dm" ? "dm" : "crawler";
      const member = await fetchActiveMembership(user.id);
      if (!member?.session_id || cancelled) return;

      let crawlerId = member.crawler_id ?? null;
      let name =
        resolvedRole === "dm"
          ? profile?.display_name?.trim() || MASTER_CHAT_NAME
          : profile?.display_name?.trim() || "Crawler";

      if (resolvedRole !== "dm") {
        const { data: crawler } = await supabase
          .from("crawlers")
          .select("id, name")
          .eq("session_id", member.session_id)
          .eq("owner_user_id", user.id)
          .maybeSingle();
        if (crawler) {
          crawlerId = crawler.id;
          name = crawler.name;
        }
      }

      if (cancelled) return;
      setLive({
        sessionId: member.session_id,
        meta: { userId: user.id, role: resolvedRole, name, crawlerId },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [role, supabase]);

  useEffect(() => {
    if (!live) return;
    const { sessionId, meta } = live;
    const release = retainSessionBus(sessionId);
    void trackSessionPresence(sessionId, meta);

    let cancelled = false;
    async function beat() {
      const { error } = await supabase
        .from("session_members")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", meta.userId);
      if (cancelled || error) return;
    }

    void beat();
    const timer = window.setInterval(() => void beat(), HEARTBEAT_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      release();
    };
  }, [live, supabase]);

  return children;
}
