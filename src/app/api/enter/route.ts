import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

type EnterBody = {
  role?: "dm" | "crawler";
  crawlerId?: string;
};

async function ensureUser(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  metadata: { role: "dm" | "crawler"; display_name: string }
) {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID() + "Aa1!",
    email_confirm: true,
    user_metadata: { display_name: metadata.display_name },
  });

  if (!createError && created.user) return created.user;

  const already =
    createError?.message?.toLowerCase().includes("already") ||
    createError?.status === 422;
  if (!already) throw createError ?? new Error("No se pudo crear el crawler");

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existing) throw new Error("Usuario existente no encontrado");
  return existing;
}

async function signInAs(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error || !data.properties?.hashed_token) {
    throw error ?? new Error("No se pudo abrir la sesión");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: data.properties.hashed_token,
  });
  if (otpError) throw otpError;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EnterBody;
    const admin = createAdminClient();

    if (body.role === "crawler" || body.crawlerId) {
      if (!body.crawlerId) {
        return NextResponse.json({ error: "Elige un crawler" }, { status: 400 });
      }

      const { data: crawler, error: crawlerError } = await admin
        .from("crawlers")
        .select("id, name, session_id")
        .eq("id", body.crawlerId)
        .maybeSingle();
      if (crawlerError) throw crawlerError;
      if (!crawler) {
        return NextResponse.json({ error: "Crawler no encontrado" }, { status: 404 });
      }

      const email = `crawler-${crawler.id}@play.local`;
      const user = await ensureUser(admin, email, {
        role: "crawler",
        display_name: crawler.name,
      });

      await admin.from("profiles").update({ role: "crawler", display_name: crawler.name }).eq("id", user.id);
      await admin.from("crawlers").update({ owner_user_id: user.id }).eq("id", crawler.id);
      await admin.from("session_members").upsert(
        { session_id: crawler.session_id, user_id: user.id, crawler_id: crawler.id },
        { onConflict: "session_id,user_id" }
      );

      await signInAs(admin, email);
      return NextResponse.json({ ok: true, redirect: "/crawler/table" });
    }

    const { data: existingDm } = await admin.from("profiles").select("id").eq("role", "dm").limit(1).maybeSingle();
    let email = "dm@play.local";
    let userId: string;

    if (existingDm?.id) {
      const { data: authUser, error } = await admin.auth.admin.getUserById(existingDm.id);
      if (error || !authUser.user?.email) {
        const user = await ensureUser(admin, email, { role: "dm", display_name: "Dungeon Master" });
        userId = user.id;
      } else {
        email = authUser.user.email;
        userId = authUser.user.id;
      }
    } else {
      const user = await ensureUser(admin, email, { role: "dm", display_name: "Dungeon Master" });
      userId = user.id;
    }

    await admin.from("profiles").update({ role: "dm", display_name: "Dungeon Master" }).eq("id", userId);

    const { data: session } = await admin
      .from("sessions")
      .select("id, created_by")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session) {
      if (session.created_by !== userId) {
        await admin.from("sessions").update({ created_by: userId }).eq("id", session.id);
      }
      await admin.from("session_members").upsert(
        { session_id: session.id, user_id: userId },
        { onConflict: "session_id,user_id" }
      );
    }

    await signInAs(admin, email);
    return NextResponse.json({ ok: true, redirect: "/dm" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo entrar";
    const friendly =
      message.toLowerCase().includes("database error creating new user")
        ? "Auth no pudo crear el perfil. En el SQL Editor de Supabase ejecuta supabase/migrations/20260903120000_fix_auth_profile_trigger.sql"
        : message;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
}
