import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

export const SESSION_BUS_EVENTS = [
  "cinematic",
  "dice_anim",
  "table_update",
  "loot_box",
  "party_patch",
  "minimap_update",
  "scene_canvas_update",
  "admin_in_room",
  "chat_message",
] as const;

export type SessionBusEvent = (typeof SESSION_BUS_EVENTS)[number];

export type SessionPresenceMeta = {
  userId: string;
  role: UserRole;
  name: string;
  crawlerId: string | null;
};

export type SessionPeer = SessionPresenceMeta;

type EventHandler = (event: string, payload: unknown) => void;
type PresenceHandler = (peers: SessionPeer[]) => void;

type Bus = {
  channel: RealtimeChannel;
  eventHandlers: Set<EventHandler>;
  presenceHandlers: Set<PresenceHandler>;
  refs: number;
  presence: SessionPresenceMeta | null;
  peers: SessionPeer[];
};

const buses = new Map<string, Bus>();

function flattenPresence(state: RealtimePresenceState<SessionPresenceMeta>): SessionPeer[] {
  const seen = new Set<string>();
  const peers: SessionPeer[] = [];
  for (const entries of Object.values(state)) {
    for (const raw of entries) {
      const row = raw as SessionPresenceMeta;
      if (!row.userId || seen.has(row.userId)) continue;
      seen.add(row.userId);
      peers.push({
        userId: row.userId,
        role: row.role === "dm" ? "dm" : "crawler",
        name: typeof row.name === "string" && row.name.trim() ? row.name : "Crawler",
        crawlerId: typeof row.crawlerId === "string" ? row.crawlerId : null,
      });
    }
  }
  return peers;
}

function emitPresence(bus: Bus) {
  bus.peers = flattenPresence(bus.channel.presenceState<SessionPresenceMeta>());
  bus.presenceHandlers.forEach((handler) => handler(bus.peers));
}

function getBus(sessionId: string): Bus {
  const existing = buses.get(sessionId);
  if (existing) return existing;

  const supabase = createClient();
  const bus: Bus = {
    channel: null as unknown as RealtimeChannel,
    eventHandlers: new Set(),
    presenceHandlers: new Set(),
    refs: 0,
    presence: null,
    peers: [],
  };

  const channel = supabase.channel(`session:${sessionId}`, {
    config: {
      broadcast: { self: true },
      presence: { key: `client:${crypto.randomUUID()}` },
    },
  });

  for (const event of SESSION_BUS_EVENTS) {
    channel.on("broadcast", { event }, ({ payload }) => {
      bus.eventHandlers.forEach((handler) => handler(event, payload));
    });
  }

  channel.on("presence", { event: "sync" }, () => emitPresence(bus));
  channel.subscribe((status) => {
    if (status !== "SUBSCRIBED" || !bus.presence) return;
    void channel.track(bus.presence);
  });

  bus.channel = channel;
  buses.set(sessionId, bus);
  return bus;
}

export function retainSessionBus(sessionId: string) {
  const bus = getBus(sessionId);
  bus.refs += 1;
  return () => {
    bus.refs -= 1;
    if (bus.refs > 0) return;
    const supabase = createClient();
    void supabase.removeChannel(bus.channel);
    buses.delete(sessionId);
  };
}

export function onSessionEvent(sessionId: string, handler: EventHandler) {
  const bus = getBus(sessionId);
  bus.eventHandlers.add(handler);
  return () => {
    bus.eventHandlers.delete(handler);
  };
}

export function onSessionPresence(sessionId: string, handler: PresenceHandler) {
  const bus = getBus(sessionId);
  bus.presenceHandlers.add(handler);
  handler(bus.peers);
  return () => {
    bus.presenceHandlers.delete(handler);
  };
}

export async function trackSessionPresence(sessionId: string, meta: SessionPresenceMeta) {
  const bus = getBus(sessionId);
  bus.presence = meta;
  if (bus.channel.state === "joined") {
    await bus.channel.track(meta);
  }
}

export async function broadcastSession(sessionId: string, event: string, payload: unknown) {
  const bus = buses.get(sessionId);
  if (!bus) return;
  await bus.channel.send({
    type: "broadcast",
    event,
    payload: payload as Record<string, unknown>,
  });
}
