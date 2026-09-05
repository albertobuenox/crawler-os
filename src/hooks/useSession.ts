"use client";

import { useEffect, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeTable<T = Record<string, unknown>>(
  table: string,
  filter: string,
  onChange: (payload: { eventType: string; new: T; old: T }) => void
) {
  const supabase = createClient();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const channel = supabase
      .channel(`${table}:${filter}`)
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
      supabase.removeChannel(channel);
    };
  }, [supabase, table, filter]);
}

export function useSessionBroadcast(
  sessionId: string | undefined,
  onMessage: (event: string, payload: unknown) => void
) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`session:${sessionId}`, {
      config: { broadcast: { self: true } },
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "cinematic" }, ({ payload }) =>
        onMessageRef.current("cinematic", payload)
      )
      .on("broadcast", { event: "dice_anim" }, ({ payload }) =>
        onMessageRef.current("dice_anim", payload)
      )
      .on("broadcast", { event: "table_update" }, ({ payload }) =>
        onMessageRef.current("table_update", payload)
      )
      .on("broadcast", { event: "loot_box" }, ({ payload }) =>
        onMessageRef.current("loot_box", payload)
      )
      .on("broadcast", { event: "party_patch" }, ({ payload }) =>
        onMessageRef.current("party_patch", payload)
      )
      .on("broadcast", { event: "minimap_update" }, ({ payload }) =>
        onMessageRef.current("minimap_update", payload)
      )
      .subscribe();

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  const broadcast = useCallback(
    async (event: string, payload: unknown) => {
      if (!sessionId) return;
      const channel = channelRef.current;
      if (!channel) return;
      await channel.send({
        type: "broadcast",
        event,
        payload: payload as Record<string, unknown>,
      });
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

export async function fetchActiveSession(userId: string) {
  const supabase = createClient();
  const { data: member } = await supabase
    .from("session_members")
    .select("session_id, sessions(*)")
    .eq("user_id", userId)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return member?.sessions ?? null;
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
