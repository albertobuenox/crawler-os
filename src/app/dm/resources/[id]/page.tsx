"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { InventorySlot } from "@/components/hud/InventorySlot";
import type { Resource, ResourceKind, Rarity } from "@/lib/types";
import { kindOptions, rarityOptions } from "@/lib/copy";

export default function ResourceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [spriteError, setSpriteError] = useState("");

  useEffect(() => {
    supabase.from("resources").select("*").eq("id", id).single().then(({ data }) => setResource(data as Resource));
  }, [id, supabase]);

  async function save() {
    if (!resource) return;
    setError("");
    setBusy(true);
    const { error: saveError } = await supabase.from("resources").update({
      name: resource.name,
      kind: resource.kind,
      rarity: resource.rarity,
      description: resource.description,
      system_copy: resource.system_copy,
      icon_url: resource.icon_url,
    }).eq("id", resource.id);
    setBusy(false);
    if (saveError) setError(saveError.message);
  }

  async function deleteResource() {
    if (!resource) return;
    setError("");
    setBusy(true);
    const { error: deleteError } = await supabase.from("resources").delete().eq("id", resource.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.push("/dm/resources");
  }

  if (!resource) return null;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-12">
        <GlassPanel className="lg:col-span-7" title="Editar recurso">
          <div className="space-y-4">
            {error && (
              <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
                {error}
              </p>
            )}
            <Input label="Nombre" value={resource.name} onChange={(e) => setResource({ ...resource, name: e.target.value })} />
            <Select label="Tipo" value={resource.kind} onChange={(e) => setResource({ ...resource, kind: e.target.value as ResourceKind })} options={kindOptions(["item","box","achievement","map","monster"])} />
            <Select label="Rareza" value={resource.rarity} onChange={(e) => setResource({ ...resource, rarity: e.target.value as Rarity })} options={rarityOptions(["common","uncommon","rare","epic","legendary","celestial"])} />
            <Textarea label="Copy del Sistema" value={resource.system_copy ?? ""} onChange={(e) => setResource({ ...resource, system_copy: e.target.value })} />
            {(resource.kind === "monster" || resource.kind === "map" || resource.kind === "npc") && (
              <div className="space-y-2">
                <p className="text-label">Sprite</p>
                <div className="flex items-center gap-3">
                  <span className="h-16 w-16 overflow-hidden rounded-[12px] border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.8)]">
                    {resource.icon_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resource.icon_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <label className="btn-neon inline-flex h-10 cursor-pointer items-center px-4 text-sm">
                    {resource.icon_url ? "Cambiar sprite" : "Subir sprite"}
                    <input
                      type="file"
                      accept="image/webp,image/png,image/jpeg,image/gif"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        setSpriteError("");
                        setBusy(true);
                        const body = new FormData();
                        body.set("file", file);
                        body.set("kind", "resource");
                        body.set("session_id", resource.session_id);
                        const res = await fetch("/api/dm/scene-assets", { method: "POST", body });
                        const json = (await res.json()) as { url?: string; error?: string };
                        setBusy(false);
                        if (!res.ok || !json.url) {
                          setSpriteError(json.error || "El Sistema rechazó el sprite.");
                          return;
                        }
                        setResource({ ...resource, icon_url: json.url });
                      }}
                    />
                  </label>
                </div>
                {spriteError && <p className="text-xs text-[var(--danger)]">{spriteError}</p>}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="session" onClick={() => void save()} loading={busy}>Guardar</Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)} loading={busy}>Borrar</Button>
            </div>
          </div>
        </GlassPanel>
        <GlassPanel className="lg:col-span-5" title="Vista del crawler">
          <div className="flex flex-col items-center gap-4 py-6">
            <InventorySlot name={resource.name} rarity={resource.rarity} />
            <p className="text-center text-sm italic text-[var(--text-2)]">{resource.system_copy}</p>
          </div>
        </GlassPanel>
      </div>
      <ConfirmModal
        open={confirmOpen}
        title={`¿Borrar ${resource.name}?`}
        body="También se quitará de inventarios, cajas y logros que lo usen."
        loading={busy}
        onCancel={() => {
          if (!busy) setConfirmOpen(false);
        }}
        onConfirm={() => void deleteResource()}
      />
    </>
  );
}
