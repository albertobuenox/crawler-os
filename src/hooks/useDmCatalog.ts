"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { refreshSessionResources } from "@/lib/catalog-write";
import { castSession } from "@/lib/utils";
import type { Crawler, GameSession, Resource } from "@/lib/types";

export function useDmCatalog() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: member } = await supabase
      .from("session_members")
      .select("sessions(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const sess = castSession(member?.sessions);
    setSession(sess ?? null);
    if (!sess) {
      setResources([]);
      setCrawlers([]);
      setLoading(false);
      return;
    }
    const [{ data, error: loadError }, crawlerResult] = await Promise.all([
      refreshSessionResources(supabase, sess.id),
      supabase.from("crawlers").select("*").eq("session_id", sess.id),
    ]);
    if (loadError) setError(loadError.message);
    const crawlerRows = ((crawlerResult.data as Crawler[]) ?? []).slice().sort((a, b) =>
      a.name.localeCompare(b.name, "es"),
    );
    setResources(data);
    setCrawlers(crawlerRows);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { supabase, session, resources, setResources, crawlers, error, setError, loading, reload };
}
