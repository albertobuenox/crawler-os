import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatFromEvent, CHAT_EVENT_KIND } from "@/lib/chat";
import { MASTER_CHAT_NAME } from "@/lib/copy";
import { CHAT_BODY_MAX, CHAT_CHANNEL_ALL, type EventLogEntry, type UserRole } from "@/lib/types";

const Body = z.object({
  sessionId: z.string().uuid(),
  channel: z.string().min(1).max(80),
  body: z.string().trim().min(1).max(CHAT_BODY_MAX),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensaje no válido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { sessionId, channel, body } = parsed.data;
  const { data: member } = await supabase
    .from("session_members")
    .select("session_id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Fuera de sesión" }, { status: 403 });

  if (channel !== CHAT_CHANNEL_ALL) {
    const { data: target } = await supabase
      .from("crawlers")
      .select("id")
      .eq("id", channel)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (!target) return NextResponse.json({ error: "Canal desconocido" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const role: UserRole = profile?.role === "dm" ? "dm" : "crawler";

  let authorName = profile?.display_name?.trim() || (role === "dm" ? MASTER_CHAT_NAME : "Crawler");
  let authorCrawlerId: string | null = null;
  if (role !== "dm") {
    const { data: crawler } = await supabase
      .from("crawlers")
      .select("id, name")
      .eq("session_id", sessionId)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (crawler) {
      authorCrawlerId = crawler.id;
      authorName = crawler.name;
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_log")
    .insert({
      session_id: sessionId,
      event_type: "SYSTEM",
      actor_id: user.id,
      target_crawler_id: channel === CHAT_CHANNEL_ALL ? null : channel,
      message: body,
      payload: {
        kind: CHAT_EVENT_KIND,
        author_user_id: user.id,
        author_name: authorName,
        author_role: role,
        author_crawler_id: authorCrawlerId,
        channel,
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo enviar" }, { status: 500 });
  }

  const message = chatFromEvent(data as EventLogEntry);
  if (!message) return NextResponse.json({ error: "No se pudo enviar" }, { status: 500 });
  return NextResponse.json(message);
}
