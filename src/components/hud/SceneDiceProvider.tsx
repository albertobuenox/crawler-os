"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchActiveMembership, useSessionBroadcast } from "@/hooks/useSession";
import { useSceneDice } from "@/hooks/useSceneDice";
import { parseAvatarEmotion, type AvatarEmotion } from "@/lib/crawler-art";

type SceneDiceApi = ReturnType<typeof useSceneDice>;

const SceneDiceContext = createContext<SceneDiceApi | null>(null);

export function useSceneDiceApi() {
  const ctx = useContext(SceneDiceContext);
  if (!ctx) throw new Error("useSceneDiceApi must be used within SceneDiceProvider");
  return ctx;
}

export function SceneDiceProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [sessionId, setSessionId] = useState<string>();
  const [self, setSelf] = useState<{
    id: string;
    name: string;
    emotion: AvatarEmotion | null;
    portraitUrl: string | null;
  } | null>(null);
  const ingestRef = useRef<(payload: unknown) => void>(() => {});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const member = await fetchActiveMembership(user.id);
      if (!member || cancelled) return;
      setSessionId(member.session_id);
      const { data: crawlers } = await supabase
        .from("crawlers")
        .select("id, name, portrait_url, avatar_emotion, owner_user_id")
        .eq("session_id", member.session_id);
      if (cancelled) return;
      const roster = crawlers ?? [];
      const mine =
        roster.find((c) => c.owner_user_id === user.id) ??
        roster.find((c) => c.id === member.crawler_id);
      if (!mine) return;
      setSelf({
        id: mine.id,
        name: mine.name,
        emotion: parseAvatarEmotion(mine.avatar_emotion),
        portraitUrl: mine.portrait_url ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const { broadcast } = useSessionBroadcast(
    sessionId,
    (event, payload) => {
      if (event === "dice_anim") ingestRef.current(payload);
      if (event === "party_patch" && payload && typeof payload === "object" && "id" in payload) {
        const patch = payload as { id: string; name?: string; portrait_url?: string | null; avatar_emotion?: unknown };
        setSelf((prev) => {
          if (!prev || prev.id !== patch.id) return prev;
          return {
            ...prev,
            name: patch.name ?? prev.name,
            portraitUrl: patch.portrait_url !== undefined ? patch.portrait_url : prev.portraitUrl,
            emotion:
              patch.avatar_emotion !== undefined ? parseAvatarEmotion(patch.avatar_emotion) : prev.emotion,
          };
        });
      }
    }
  );

  const dice = useSceneDice(broadcast, self, sessionId);
  ingestRef.current = dice.ingest;

  return <SceneDiceContext.Provider value={dice}>{children}</SceneDiceContext.Provider>;
}
