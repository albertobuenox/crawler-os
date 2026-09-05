import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SCENE_LOG_KIND,
  sceneLogEventType,
  sceneLogMessage,
  type SceneLogPostBody,
} from "@/lib/scene-log";
import type { EventLogEntry, UserRole } from "@/lib/types";

const Body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(SCENE_LOG_KIND.roll),
    sessionId: z.string().uuid(),
    crawlerId: z.string().uuid(),
    formula: z.string().trim().min(2).max(16),
    sides: z.number().int().min(2).max(100),
    value: z.number().int().min(1).max(1000),
  }),
  z.object({
    kind: z.literal(SCENE_LOG_KIND.vital),
    sessionId: z.string().uuid(),
    crawlerId: z.string().uuid(),
    field: z.enum(["hp", "mana"]),
    from: z.number().int().min(0).max(9999),
    to: z.number().int().min(0).max(9999),
  }),
  z.object({
    kind: z.literal(SCENE_LOG_KIND.stat),
    sessionId: z.string().uuid(),
    crawlerId: z.string().uuid(),
    stat: z.enum(["str", "int", "con", "dex", "cha", "level"]),
    from: z.number().int().min(0).max(999),
    to: z.number().int().min(0).max(999),
  }),
]);

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Evento no válido" }, { status: 400 });
  }

  const input = parsed.data as SceneLogPostBody;
  if (input.kind !== SCENE_LOG_KIND.roll && input.from === input.to) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: member } = await supabase
    .from("session_members")
    .select("session_id")
    .eq("user_id", user.id)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!member) return NextResponse.json({ error: "Fuera de sesión" }, { status: 403 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role: UserRole = profile?.role === "dm" ? "dm" : "crawler";

  const { data: crawler } = await supabase
    .from("crawlers")
    .select("id, name, owner_user_id, session_id")
    .eq("id", input.crawlerId)
    .eq("session_id", input.sessionId)
    .maybeSingle();
  if (!crawler) return NextResponse.json({ error: "Crawler desconocido" }, { status: 400 });

  if (role !== "dm" && crawler.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const crawlerName = crawler.name?.trim() || "Crawler";
  const message = sceneLogMessage(input, crawlerName);
  const eventType = sceneLogEventType(
    input.kind,
    input.kind === SCENE_LOG_KIND.vital ? { field: input.field } : undefined
  );

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_log")
    .insert({
      session_id: input.sessionId,
      event_type: eventType,
      actor_id: user.id,
      target_crawler_id: input.crawlerId,
      message,
      payload: {
        kind: input.kind,
        crawler_id: input.crawlerId,
        crawler_name: crawlerName,
        author_user_id: user.id,
        author_role: role,
        ...(input.kind === SCENE_LOG_KIND.roll
          ? { formula: input.formula, sides: input.sides, value: input.value }
          : input.kind === SCENE_LOG_KIND.vital
            ? { field: input.field, from: input.from, to: input.to }
            : { stat: input.stat, from: input.from, to: input.to }),
      },
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo registrar" }, { status: 500 });
  }

  return NextResponse.json(data as EventLogEntry);
}
