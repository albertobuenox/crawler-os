import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const IMAGE_TYPES = new Set(["image/webp", "image/png", "image/jpeg", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024;

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

    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "map");
    const sessionId = String(form.get("session_id") ?? "session");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Falta la imagen." }, { status: 400 });
    }
    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Usa WebP, PNG, JPG o GIF." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "La imagen no puede pesar más de 8 MB." }, { status: 400 });
    }

    const ext =
      file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : file.type === "image/gif" ? "gif" : "webp";
    const folder = kind === "sprite" || kind === "resource" ? "sprites" : "maps";
    const path = `${folder}/${sessionId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await gate.admin.storage.from("scene-assets").upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw error;
    const { data } = gate.admin.storage.from("scene-assets").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo subir la imagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
