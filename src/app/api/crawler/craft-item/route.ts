import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, supabaseReachError } from "@/lib/supabase/admin";
import { upsertResource } from "@/lib/catalog-write";
import { buildEquipmentPayload, isEquipSlotId } from "@/lib/equipment";
import type { EquipSlotId, EquipmentBonus } from "@/lib/equipment";

type CraftKind = "equipment" | "consumable" | "misc";

type CraftBody = {
  name?: string;
  kind?: CraftKind;
  description?: string;
  system_copy?: string;
  icon_url?: string | null;
  equip_slot?: string;
  is_unique?: boolean;
  bonuses?: EquipmentBonus[];
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: crawler } = await supabase
      .from("crawlers")
      .select("id, session_id")
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!crawler) {
      return NextResponse.json({ error: "Sin crawler asignado." }, { status: 403 });
    }

    const body = (await request.json()) as CraftBody;
    const kind = body.kind;
    const name = body.name?.trim() ?? "";
    if (!name) return NextResponse.json({ error: "Ponle un nombre." }, { status: 400 });
    if (kind !== "equipment" && kind !== "consumable" && kind !== "misc") {
      return NextResponse.json({ error: "Elige equipo, consumible o misceláneo." }, { status: 400 });
    }

    const admin = createAdminClient();
    const isEquipment = kind === "equipment";
    const slot = isEquipment && isEquipSlotId(body.equip_slot) ? body.equip_slot : null;
    if (isEquipment && !slot) {
      return NextResponse.json({ error: "El equipo necesita un slot." }, { status: 400 });
    }

    const payload = isEquipment
      ? {
          ...buildEquipmentPayload({}, body.bonuses ?? [], slot as EquipSlotId),
          player_crafted: true,
        }
      : { player_crafted: true };

    const result = await upsertResource(admin, crawler.session_id, null, {
      name,
      kind: "item",
      rarity: "common",
      description: body.description?.trim() || null,
      system_copy: body.system_copy?.trim() || null,
      icon_url: body.icon_url ?? null,
      loot_rarity: null,
      loot_floor: null,
      is_unique: isEquipment ? Boolean(body.is_unique) : false,
      equip_slot: slot,
      item_category: kind,
      payload,
    });
    if (result.error || !result.data) {
      return NextResponse.json({ error: result.error?.message ?? "No se pudo crear." }, { status: 400 });
    }

    const instance = await admin
      .from("item_instances")
      .insert({
        crawler_id: crawler.id,
        resource_id: result.data.id,
        quantity: 1,
      })
      .select("*, resource:resources(*)")
      .single();
    if (instance.error || !instance.data) {
      return NextResponse.json({ error: instance.error?.message ?? "El objeto se creó pero no llegó a la mochila." }, { status: 400 });
    }

    return NextResponse.json({ item: instance.data });
  } catch (err) {
    return NextResponse.json(
      { error: supabaseReachError(err, "El Sistema rechazó el objeto.") },
      { status: 400 },
    );
  }
}
