import { CHAT_CHANNEL_ALL, type ChatMessage, type EventLogEntry, type UserRole } from "@/lib/types";

export const CHAT_EVENT_KIND = "chat";

export type ChatChannelOption = { id: string; label: string };

const PLAYER_CHANNEL_COLORS = [
  "var(--magenta-500)",
  "var(--gold-400)",
  "var(--orange-400)",
  "var(--ok)",
  "var(--purple-500)",
  "var(--pink-500)",
];

export function chatChannelColor(channel: string, playerIds: string[]): string {
  if (channel === CHAT_CHANNEL_ALL) return "var(--cyan-400)";
  const idx = playerIds.indexOf(channel);
  const safe = idx >= 0 ? idx : Math.abs(hashString(channel));
  return PLAYER_CHANNEL_COLORS[safe % PLAYER_CHANNEL_COLORS.length];
}

export function chatChannelLabel(channel: string, members: ChatChannelOption[]): string {
  if (channel === CHAT_CHANNEL_ALL) return "All";
  return members.find((m) => m.id === channel)?.label ?? "Jugador";
}

export function chatChannelCycle(members: ChatChannelOption[]): string[] {
  return [CHAT_CHANNEL_ALL, ...members.map((member) => member.id)];
}

export function cycleChatChannel(
  current: string,
  members: ChatChannelOption[],
  step = 1
): string {
  const channels = chatChannelCycle(members);
  const index = channels.indexOf(current);
  const from = index >= 0 ? index : 0;
  const next = ((from + step) % channels.length + channels.length) % channels.length;
  return channels[next] ?? CHAT_CHANNEL_ALL;
}

export function isChatEvent(entry: Pick<EventLogEntry, "payload"> | null | undefined): boolean {
  return entry?.payload?.kind === CHAT_EVENT_KIND;
}

export function chatFromEvent(row: EventLogEntry): ChatMessage | null {
  if (!isChatEvent(row)) return null;
  const payload = row.payload ?? {};
  const role: UserRole = payload.author_role === "dm" ? "dm" : "crawler";
  return {
    id: row.id,
    session_id: row.session_id,
    author_user_id: typeof payload.author_user_id === "string" ? payload.author_user_id : "",
    author_name: typeof payload.author_name === "string" ? payload.author_name : "Crawler",
    author_role: role,
    author_crawler_id: typeof payload.author_crawler_id === "string" ? payload.author_crawler_id : null,
    channel: typeof payload.channel === "string" ? payload.channel : CHAT_CHANNEL_ALL,
    body: row.message,
    created_at: row.created_at,
  };
}

export function upsertChatMessage(list: ChatMessage[], incoming: ChatMessage): ChatMessage[] {
  if (list.some((m) => m.id === incoming.id)) return list;
  const next = [...list, incoming];
  next.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  return next;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
