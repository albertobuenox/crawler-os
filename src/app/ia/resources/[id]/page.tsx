"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { InventorySlot } from "@/components/hud/InventorySlot";
import type { Resource, ResourceKind, Rarity } from "@/lib/types";

export default function ResourceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [resource, setResource] = useState<Resource | null>(null);

  useEffect(() => {
    supabase.from("resources").select("*").eq("id", id).single().then(({ data }) => setResource(data as Resource));
  }, [id, supabase]);

  async function save() {
    if (!resource) return;
    await supabase.from("resources").update({
      name: resource.name,
      kind: resource.kind,
      rarity: resource.rarity,
      description: resource.description,
      system_copy: resource.system_copy,
    }).eq("id", resource.id);
  }

  if (!resource) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <GlassPanel className="lg:col-span-7" title="Edit Resource">
        <div className="space-y-4">
          <Input label="Name" value={resource.name} onChange={(e) => setResource({ ...resource, name: e.target.value })} />
          <Select label="Kind" value={resource.kind} onChange={(e) => setResource({ ...resource, kind: e.target.value as ResourceKind })} options={["item","box","achievement","map","monster"].map((k) => ({ value: k, label: k }))} />
          <Select label="Rarity" value={resource.rarity} onChange={(e) => setResource({ ...resource, rarity: e.target.value as Rarity })} options={["common","uncommon","rare","epic","legendary","celestial"].map((r) => ({ value: r, label: r }))} />
          <Textarea label="System copy" value={resource.system_copy ?? ""} onChange={(e) => setResource({ ...resource, system_copy: e.target.value })} />
          <Button variant="session" onClick={save}>Save</Button>
        </div>
      </GlassPanel>
      <GlassPanel className="lg:col-span-5" title="Player preview">
        <div className="flex flex-col items-center gap-4 py-6">
          <InventorySlot name={resource.name} rarity={resource.rarity} />
          <p className="text-center text-sm italic text-[var(--text-2)]">{resource.system_copy}</p>
        </div>
      </GlassPanel>
    </div>
  );
}
