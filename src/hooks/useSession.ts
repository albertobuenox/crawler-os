"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { broadcastSession, onSessionEvent, retainSessionBus } from "@/lib/session-bus";
import { castSession } from "@/lib/utils";

export function useRealtimeTable<T = Record<string, unknown>>(
  table: string,
  filter: string,
  onChange: (payload: { eventType: string; new: T; old: T }) => void
) {
  const supabase = createClient();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const topic = `${table}:${filter}:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(topic)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        (payload) => {
          onChangeRef.current({
            eventType: payload.eventType,
            new: payload.new as T,
            old: payload.old as T,
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, table, filter]);
}

export function useSessionBroadcast(
  sessionId: string | undefined,
  onMessage: (event: string, payload: unknown) => void
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!sessionId) return;
    const release = retainSessionBus(sessionId);
    const off = onSessionEvent(sessionId, (event, payload) => {
      onMessageRef.current(event, payload);
    });
    return () => {
      off();
      release();
    };
  }, [sessionId]);

  const broadcast = useCallback(
    async (event: string, payload: unknown) => {
      if (!sessionId) return;
      await broadcastSession(sessionId, event, payload);
    },
    [sessionId]
  );

  return { broadcast };
}

export async function fetchProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
}

export async function fetchActiveMembership(userId: string) {
  const supabase = createClient();
  const { data: members } = await supabase
    .from("session_members")
    .select("session_id, crawler_id, joined_at, sessions(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false });

  const rows = members ?? [];
  const live = rows.find((row) => castSession(row.sessions)?.is_active);
  return live ?? rows[0] ?? null;
}

export async function fetchActiveSession(userId: string) {
  const member = await fetchActiveMembership(userId);
  return member ? castSession(member.sessions) : null;
}

export async function fetchMyCrawler(sessionId: string, userId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("crawlers")
    .select("*")
    .eq("session_id", sessionId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  return data;
}
