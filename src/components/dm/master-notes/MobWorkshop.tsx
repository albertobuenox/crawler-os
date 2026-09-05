"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Skull, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { defaultMobSprite, MOB_TYPE_LABEL, MOB_TYPES } from "@/lib/master-notes";
import type { DmMob, MobType } from "@/lib/types";

export function MobWorkshop({ sessionId, openCreate }: { sessionId: string; openCreate?: boolean }) {
  const supabase = createClient();
  const [mobs, setMobs] = useState<DmMob[]>([]);
  const [showForm, setShowForm] = useState(!!openCreate);
  const [name, setName] = useState("");
  const [level, setLevel] = useState(1);
  const [mobType, setMobType] = useState<MobType>("beast");
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DmMob | null>(null);

  useEffect(() => {
    if (openCreate) setShowForm(true);
  }, [openCreate]);

  async function load() {
    const { data, error: loadError } = await supabase.from("dm_mobs").select("*").eq("session_id", sessionId).order("name");
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setMobs((data as DmMob[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, [sessionId]);

  async function createMob(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: insertError } = await supabase.from("dm_mobs").insert({
      session_id: sessionId,
      name: name.trim(),
      level,
      mob_type: mobType,
      sprite_url: defaultMobSprite(mobType),
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    setLevel(1);
    setShowForm(false);
    void load();
  }

  async function uploadSprite(mob: DmMob, file: File) {
    setUploadingId(mob.id);
    setError("");
    const body = new FormData();
    body.set("file", file);
    body.set("kind", "sprite");
    body.set("session_id", sessionId);
    const res = await fetch("/api/dm/scene-assets", { method: "POST", body });
    const json = (await res.json()) as { url?: string; error?: string };
    setUploadingId(null);
    if (!res.ok || !json.url) {
      setError(json.error || "El Sistema rechazó el sprite.");
      return;
    }
    await supabase.from("dm_mobs").update({ sprite_url: json.url }).eq("id", mob.id);
    void load();
  }

  async function resetSprite(mob: DmMob) {
    await supabase.from("dm_mobs").update({ sprite_url: defaultMobSprite(mob.mob_type) }).eq("id", mob.id);
    void load();
  }

  async function patchMob(mob: DmMob, patch: Partial<DmMob>) {
    const nextType = patch.mob_type ?? mob.mob_type;
    const usingDefault = !mob.sprite_url || mob.sprite_url.startsWith("/mobs/");
    await supabase
      .from("dm_mobs")
      .update({
        ...patch,
        sprite_url: usingDefault && patch.mob_type ? defaultMobSprite(nextType) : mob.sprite_url,
      })
      .eq("id", mob.id);
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label text-[var(--danger)]">Bestiario</p>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Nivel, tipo y sprite. Luego los colocas en Escena igual que a los crawlers.
          </p>
        </div>
        <Button variant="energy" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Nuevo mob"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {showForm && (
        <GlassPanel title="Nuevo mob" subtitle="El sprite por defecto sale del tipo. Puedes sustituirlo.">
          <form onSubmit={(e) => void createMob(e)} className="grid gap-4 md:grid-cols-3">
            <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
            <Input
              label="Nivel"
              type="number"
              min={1}
              max={99}
              value={level}
              onChange={(e) => setLevel(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
            />
            <Select
              label="Tipo"
              value={mobType}
              onChange={(e) => setMobType(e.target.value as MobType)}
              options={MOB_TYPES.map((value) => ({ value, label: MOB_TYPE_LABEL[value] }))}
            />
            <div className="md:col-span-3 flex items-center gap-3">
              <span className="h-14 w-14 overflow-hidden rounded-[14px] border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.85)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={defaultMobSprite(mobType)} alt="" className="h-full w-full object-cover" />
              </span>
              <p className="text-xs text-[var(--text-3)]">Sprite por defecto: {MOB_TYPE_LABEL[mobType]}.</p>
            </div>
            <Button type="submit" variant="session" loading={busy}>
              Registrar mob
            </Button>
          </form>
        </GlassPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mobs.length === 0 && (
          <p className="well col-span-full px-4 py-8 text-center text-sm text-[var(--text-3)]">
            El bestiario está vacío. Da igual: los crawlers también.
          </p>
        )}
        {mobs.map((mob) => (
          <MobCard
            key={mob.id}
            mob={mob}
            uploading={uploadingId === mob.id}
            onPatch={(patch) => void patchMob(mob, patch)}
            onUpload={(file) => void uploadSprite(mob, file)}
            onReset={() => void resetSprite(mob)}
            onDelete={() => setPendingDelete(mob)}
          />
        ))}
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="¿Borrar este mob?"
        body="Las fichas ya puestas en escena se quedan. Solo desaparece del bestiario."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await supabase.from("dm_mobs").delete().eq("id", pendingDelete.id);
          setMobs((current) => current.filter((row) => row.id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function MobNameField({ name, onCommit }: { name: string; onCommit: (name: string) => void }) {
  const [value, setValue] = useState(name);
  useEffect(() => setValue(name), [name]);
  return (
    <Input
      label="Nombre"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value.trim();
        if (next && next !== name) onCommit(next);
      }}
    />
  );
}

function MobLevelField({ level, onCommit }: { level: number; onCommit: (level: number) => void }) {
  const [value, setValue] = useState(String(level));
  useEffect(() => setValue(String(level)), [level]);
  return (
    <Input
      label="Nivel"
      type="number"
      min={1}
      max={99}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = Math.min(99, Math.max(1, Number(value) || 1));
        if (next !== level) onCommit(next);
      }}
    />
  );
}

function MobCard({
  mob,
  uploading,
  onPatch,
  onUpload,
  onReset,
  onDelete,
}: {
  mob: DmMob;
  uploading: boolean;
  onPatch: (patch: Partial<DmMob>) => void;
  onUpload: (file: File) => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const src = mob.sprite_url || defaultMobSprite(mob.mob_type);

  return (
    <GlassPanel>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[16px] border border-[var(--stroke-danger)] bg-[rgba(8,10,18,0.85)]"
          title="Cambiar sprite"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[rgba(5,6,13,0.72)] py-1 text-[9px] tracking-wide text-[var(--cyan-300)]">
            <ImagePlus size={10} />
            {uploading ? "…" : "Editar"}
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/webp,image/svg+xml,.webp,.svg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload(file);
          }}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <MobNameField name={mob.name} onCommit={(name) => onPatch({ name })} />
          <div className="grid grid-cols-2 gap-2">
            <MobLevelField level={mob.level} onCommit={(level) => onPatch({ level })} />
            <Select
              label="Tipo"
              value={mob.mob_type}
              onChange={(e) => onPatch({ mob_type: e.target.value as MobType })}
              options={MOB_TYPES.map((value) => ({ value, label: MOB_TYPE_LABEL[value] }))}
            />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={onReset}>
          Sprite por defecto
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <Trash2 size={14} /> Borrar
        </Button>
        <span className="ml-auto flex items-center gap-1 self-center text-[10px] tracking-wide text-[var(--text-4)]">
          <Skull size={12} /> Escena / Mobs
        </span>
      </div>
    </GlassPanel>
  );
}
