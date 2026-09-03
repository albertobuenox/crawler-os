import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireDm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "dm") {
    return { error: NextResponse.json({ error: "Solo el Dungeon Master" }, { status: 403 }) };
  }
  return { admin: createAdminClient() };
}

export async function POST(request: Request) {
  try {
    const gate = await requireDm();
    if ("error" in gate) return gate.error;
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      roll_min?: number;
      roll_max?: number;
      page_ref?: number;
      animal_only?: boolean;
    };
    const { error, data } = await gate.admin
      .from("skill_catalog")
      .insert({
        name: body.name,
        slug: body.slug,
        roll_min: body.roll_min,
        roll_max: body.roll_max,
        page_ref: body.page_ref,
        animal_only: body.animal_only ?? false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ skill: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo crear la skill";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireDm();
    if ("error" in gate) return gate.error;
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      roll_min?: number;
      roll_max?: number;
      page_ref?: number;
      animal_only?: boolean;
    };
    if (!body.id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    const { error, data } = await gate.admin
      .from("skill_catalog")
      .update({
        name: body.name,
        roll_min: body.roll_min,
        roll_max: body.roll_max,
        page_ref: body.page_ref,
        animal_only: body.animal_only,
      })
      .eq("id", body.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ skill: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo guardar la skill";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const gate = await requireDm();
    if ("error" in gate) return gate.error;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    const { error } = await gate.admin.from("skill_catalog").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo borrar la skill";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
