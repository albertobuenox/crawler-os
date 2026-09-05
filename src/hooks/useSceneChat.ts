"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { broadcastSession, onSessionEvent, retainSessionBus } from "@/lib/session-bus";
import { chatFromEvent, cycleChatChannel, upsertChatMessage, type ChatChannelOption } from "@/lib/chat";
import { MASTER_CHAT_NAME } from "@/lib/copy";
import {
  CHAT_BODY_MAX,
  CHAT_CHANNEL_ALL,
  type ChatMessage,
  type EventLogEntry,
  type UserRole,
} from "@/lib/types";

const HISTORY_LIMIT = 120;

export function useSceneChat(
  sessionId: string | undefined,
  members?: ChatChannelOption[]
) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channel, setChannel] = useState(CHAT_CHANNEL_ALL);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const [roster, setRoster] = useState<ChatChannelOption[]>(members ?? []);
  const membersRef = useRef(members);
  membersRef.current = members;
  const authorRef = useRef<{
    userId: string;
    name: string;
    role: UserRole;
    crawlerId: string | null;
  } | null>(null);

  const pushMessage = useCallback((incoming: ChatMessage) => {
    if (!sessionId || incoming.session_id !== sessionId) return;
    setMessages((prev) => upsertChatMessage(prev, incoming));
  }, [sessionId]);

  useEffect(() => {
    if (!members) return;
    setRoster((prev) => {
      const same =
        prev.length === members.length &&
        prev.every((m, i) => m.id === members[i]?.id && m.label === members[i]?.label);
      return same ? prev : members;
    });
  }, [members]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, display_name")
        .eq("id", user.id)
        .maybeSingle();

      const role = (profile?.role as UserRole | undefined) ?? "crawler";
      let crawlerId: string | null = null;
      let name =
        role === "dm"
          ? (profile?.display_name?.trim() || MASTER_CHAT_NAME)
          : (profile?.display_name?.trim() || "Crawler");

      if (role !== "dm") {
        const { data: crawler } = await supabase
          .from("crawlers")
          .select("id, name")
          .eq("session_id", sessionId)
          .eq("owner_user_id", user.id)
          .maybeSingle();
        if (crawler) {
          crawlerId = crawler.id;
          name = crawler.name;
        }
      }

      authorRef.current = { userId: user.id, name, role, crawlerId };

      const [{ data: history }, { data: crawlers }] = await Promise.all([
        supabase
          .from("event_log")
          .select("*")
          .eq("session_id", sessionId)
          .contains("payload", { kind: "chat" })
          .order("created_at", { ascending: true })
          .limit(HISTORY_LIMIT),
        membersRef.current
          ? Promise.resolve({ data: null })
          : supabase.from("crawlers").select("id, name").eq("session_id", sessionId).order("name"),
      ]);

      if (cancelled) return;
      setMessages(
        ((history as EventLogEntry[]) ?? [])
          .map(chatFromEvent)
          .filter((msg): msg is ChatMessage => !!msg)
      );
      if (!membersRef.current) {
        setRoster(
          ((crawlers as { id: string; name: string }[]) ?? []).map((c) => ({
            id: c.id,
            label: c.name,
          }))
        );
      }
      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (!sessionId) return;
    const live = supabase
      .channel(`scene-chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_log",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const msg = chatFromEvent(payload.new as EventLogEntry);
          if (msg) pushMessage(msg);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crawlers", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          if (membersRef.current) return;
          const row = payload.new as { id?: string; name?: string } | undefined;
          const old = payload.old as { id?: string } | undefined;
          if (payload.eventType === "DELETE" && old?.id) {
            setRoster((prev) => prev.filter((m) => m.id !== old.id));
            return;
          }
          if (row?.id && row.name) {
            setRoster((prev) => {
              if (prev.some((m) => m.id === row.id)) {
                return prev.map((m) => (m.id === row.id ? { ...m, label: row.name! } : m));
              }
              return [...prev, { id: row.id!, label: row.name! }].sort((a, b) =>
                a.label.localeCompare(b.label)
              );
            });
          }
        }
      )
      .subscribe();

    const release = retainSessionBus(sessionId);
    const off = onSessionEvent(sessionId, (event, payload) => {
      if (event !== "chat_message" || !payload || typeof payload !== "object") return;
      const msg = payload as ChatMessage;
      if (!msg.id || !msg.body || !msg.created_at) return;
      pushMessage(msg);
    });

    return () => {
      off();
      release();
      supabase.removeChannel(live);
    };
  }, [pushMessage, sessionId, supabase]);

  const cycleChannel = useCallback(
    (step = 1) => {
      setChannel((current) => cycleChatChannel(current, roster, step));
    },
    [roster]
  );

  const send = useCallback(async () => {
    const author = authorRef.current;
    const body = draft.trim();
    if (!sessionId || !author || !body || sending) return false;
    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          channel,
          body: body.slice(0, CHAT_BODY_MAX),
        }),
      });
      const payload = (await res.json().catch(() => null)) as ChatMessage | { error?: string } | null;
      if (!res.ok || !payload || !("id" in payload) || !payload.id) return false;
      const msg = payload as ChatMessage;
      pushMessage(msg);
      setDraft("");
      await broadcastSession(sessionId, "chat_message", msg);
      return true;
    } finally {
      setSending(false);
    }
  }, [channel, draft, pushMessage, sending, sessionId]);

  return {
    messages,
    channel,
    setChannel,
    cycleChannel,
    draft,
    setDraft,
    sending,
    ready,
    roster,
    selfUserId: authorRef.current?.userId ?? null,
    send,
  };
}
