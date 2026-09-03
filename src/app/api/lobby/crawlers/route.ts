import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: sessions, error: sessionError } = await admin
      .from("sessions")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (sessionError) throw sessionError;
    const sessionIds = (sessions ?? []).map((s) => s.id);
    if (sessionIds.length === 0) {
      return NextResponse.json({ crawlers: [] });
    }

    const { data, error } = await admin
      .from("crawlers")
      .select("id, name, race, class_name, level, status, session_id")
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ crawlers: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudieron cargar los crawlers";
    return NextResponse.json({ error: message, crawlers: [] }, { status: 500 });
  }
}
