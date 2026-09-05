import { NextResponse } from "next/server";
import { createAdminClient, supabaseReachError } from "@/lib/supabase/admin";
import { isPresenceFresh } from "@/lib/live-session";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: session, error: sessionError } = await admin
      .from("sessions")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ crawlers: [] });
    }

    const [{ data, error }, membersResult] = await Promise.all([
      admin
        .from("crawlers")
        .select("id, name, race, class_name, level, status, session_id")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true }),
      admin
        .from("session_members")
        .select("crawler_id, last_seen_at")
        .eq("session_id", session.id),
    ]);

    if (error) throw error;

    const onlineByCrawler = new Map<string, boolean>();
    for (const member of membersResult.data ?? []) {
      if (!member.crawler_id) continue;
      onlineByCrawler.set(member.crawler_id, isPresenceFresh(member.last_seen_at));
    }

    const crawlers = (data ?? []).map((crawler) => ({
      ...crawler,
      online: onlineByCrawler.get(crawler.id) === true,
    }));

    return NextResponse.json({ crawlers });
  } catch (err) {
    const message = supabaseReachError(err, "No se pudieron cargar los crawlers");
    const missingColumn =
      message.toLowerCase().includes("last_seen_at") ||
      message.toLowerCase().includes("does not exist");
    if (missingColumn) {
      try {
        const admin = createAdminClient();
        const { data: session } = await admin
          .from("sessions")
          .select("id")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!session) return NextResponse.json({ crawlers: [] });
        const { data } = await admin
          .from("crawlers")
          .select("id, name, race, class_name, level, status, session_id")
          .eq("session_id", session.id)
          .order("created_at", { ascending: true });
        return NextResponse.json({
          crawlers: (data ?? []).map((crawler) => ({ ...crawler, online: false })),
        });
      } catch (fallbackErr) {
        return NextResponse.json(
          { error: supabaseReachError(fallbackErr, "No se pudieron cargar los crawlers"), crawlers: [] },
          { status: 500 }
        );
      }
    }
    return NextResponse.json({ error: message, crawlers: [] }, { status: 500 });
  }
}
