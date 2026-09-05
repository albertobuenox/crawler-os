import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSkillKind } from "@/lib/skills";

const THUMB_TYPES = new Set(["image/webp", "image/png", "image/jpeg", "image/gif"]);

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

type CatalogFields = {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  kind?: string;
  thumb?: File | null;
};

async function readCatalogRequest(request: Request): Promise<CatalogFields> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const thumb = form.get("thumb");
    return {
      id: stringField(form.get("id")),
      name: stringField(form.get("name")),
      slug: stringField(form.get("slug")),
      description: stringField(form.get("description")),
      kind: stringField(form.get("kind")),
      thumb: thumb instanceof File && thumb.size > 0 ? thumb : null,
    };
  }
  const body = (await request.json()) as CatalogFields;
  return { ...body, thumb: null };
}

function stringField(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function uploadThumb(
  admin: ReturnType<typeof createAdminClient>,
  file: File,
  slug: string
): Promise<string> {
  if (!THUMB_TYPES.has(file.type)) {
    throw new Error("La miniatura tiene que ser WebP, PNG, JPG o GIF.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("La miniatura no puede pesar más de 2 MB.");
  }
  const ext = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : file.type === "image/gif" ? "gif" : "webp";
  const path = `spells/${slug}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from("skill-thumbs").upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = admin.storage.from("skill-thumbs").getPublicUrl(path);
  return data.publicUrl;
}

export async function POST(request: Request) {
  try {
    const gate = await requireDm();
    if ("error" in gate) return gate.error;
    const body = await readCatalogRequest(request);
    if (!body.name?.trim()) return NextResponse.json({ error: "Ponle un nombre al spell." }, { status: 400 });
    if (!body.description?.trim()) {
      return NextResponse.json({ error: "Todos los conjuros necesitan una descripción." }, { status: 400 });
    }
    if (!isSkillKind(body.kind)) {
      return NextResponse.json({ error: "Elige un tipo: Ataque, Defensa, Apoyo o Destreza." }, { status: 400 });
    }
    const slug = body.slug?.trim();
    if (!slug) return NextResponse.json({ error: "Falta el slug." }, { status: 400 });

    let thumb_url: string | null = null;
    if (body.thumb) thumb_url = await uploadThumb(gate.admin, body.thumb, slug);

    const { error, data } = await gate.admin
      .from("spell_catalog")
      .insert({
        name: body.name.trim(),
        slug,
        description: body.description.trim(),
        kind: body.kind,
        thumb_url,
      })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ spell: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo crear el spell";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const gate = await requireDm();
    if ("error" in gate) return gate.error;
    const body = await readCatalogRequest(request);
    if (!body.id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Ponle un nombre al spell." }, { status: 400 });
    }
    if (body.kind !== undefined && !isSkillKind(body.kind)) {
      return NextResponse.json({ error: "Elige un tipo: Ataque, Defensa, Apoyo o Destreza." }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name.trim();
    if (body.description !== undefined) patch.description = body.description.trim();
    if (body.kind !== undefined) patch.kind = body.kind;

    if (body.thumb) {
      const { data: current } = await gate.admin
        .from("spell_catalog")
        .select("slug")
        .eq("id", body.id)
        .single();
      const slug = (current as { slug?: string } | null)?.slug || body.id;
      patch.thumb_url = await uploadThumb(gate.admin, body.thumb, slug);
    }

    const { error, data } = await gate.admin
      .from("spell_catalog")
      .update(patch)
      .eq("id", body.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ spell: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo guardar el spell";
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
    const { error } = await gate.admin.from("spell_catalog").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo borrar el spell";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
