import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { crawlerId, email } = (await request.json()) as {
      crawlerId?: string;
      email?: string;
    };

    if (!crawlerId || !email) {
      return NextResponse.json({ error: "crawlerId y email son obligatorios" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify crawler exists
    const { data: crawler, error: crawlerErr } = await admin
      .from("crawlers")
      .select("id, name, session_id")
      .eq("id", crawlerId)
      .maybeSingle();
    if (crawlerErr) throw crawlerErr;
    if (!crawler) {
      return NextResponse.json({ error: "Crawler no encontrado" }, { status: 404 });
    }

    // Find or create user by email
    let userId: string;

    const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) throw listErr;

    const existing = listData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          password: "crawleros",
          email_confirm: true,
          user_metadata: { display_name: crawler.name },
        });
      if (createErr) throw createErr;
      userId = created.user.id;
    }

    // Ensure profile exists with crawler role
    await admin
      .from("profiles")
      .upsert(
        { id: userId, role: "crawler", display_name: crawler.name },
        { onConflict: "id" }
      );

    // Assign crawler to this user
    await admin
      .from("crawlers")
      .update({ owner_user_id: userId })
      .eq("id", crawlerId);

    // Add as session member
    await admin.from("session_members").upsert(
      {
        session_id: crawler.session_id,
        user_id: userId,
        crawler_id: crawlerId,
      },
      { onConflict: "session_id,user_id" }
    );

    return NextResponse.json({ ok: true, userId, email });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al asignar usuario";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
