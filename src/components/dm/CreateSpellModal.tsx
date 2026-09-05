"use client";

import { useEffect, useId, useState } from "react";
import { ImagePlus, WandSparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { SpellThumb } from "@/components/hud/SpellThumb";
import { BRAND, SKILL_KIND_LABEL } from "@/lib/copy";
import { isSkillKind, SKILL_KINDS } from "@/lib/skills";
import type { SkillKind, SpellCatalogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<SkillKind, string> = {
  ataque: "border-[var(--stroke-reward)] bg-[rgba(249,115,22,0.12)] text-[var(--orange-400)]",
  defensa: "border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.1)] text-[var(--cyan-400)]",
  apoyo: "border-[var(--stroke-reward)] bg-[rgba(251,191,36,0.1)] text-[var(--gold-400)]",
  destreza: "border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.1)] text-[var(--magenta-400)]",
};

interface CreateSpellModalProps {
  open: boolean;
  editing?: SpellCatalogEntry | null;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    kind: SkillKind;
    thumb?: File | null;
  }) => void;
}

export function CreateSpellModal({
  open,
  editing,
  busy = false,
  error = "",
  onClose,
  onSubmit,
}: CreateSpellModalProps) {
  const fileId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<SkillKind>("ataque");
  const [thumb, setThumb] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setKind(editing?.kind && isSkillKind(editing.kind) ? editing.kind : "ataque");
    setThumb(null);
    setPreview(null);
    setLocalError("");
  }, [open, editing]);

  useEffect(() => {
    if (!thumb) return;
    const url = URL.createObjectURL(thumb);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumb]);

  function pickFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("La miniatura tiene que ser una imagen.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLocalError("La miniatura no puede pesar más de 2 MB.");
      return;
    }
    setLocalError("");
    setThumb(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setLocalError("Ponle un nombre al spell.");
      return;
    }
    if (!editing && !description.trim()) {
      setLocalError("Todos los conjuros necesitan una descripción.");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      kind,
      thumb,
    });
  }

  const shownError = localError || error;
  const previewSrc = preview ?? editing?.thumb_url ?? null;

  return (
    <Modal
      open={open}
      eyebrow={`${BRAND} — CATÁLOGO`}
      title={editing ? `Editar ${editing.name}` : "Nuevo spell"}
      subtitle="Nombre, tipo, descripción y miniatura. El resto se asigna al crawler."
      action={
        editing && !previewSrc ? (
          <SpellThumb slug={editing.slug} thumbUrl={editing.thumb_url} size="md" tip={editing} />
        ) : undefined
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <label
          htmlFor={fileId}
          className={cn(
            "flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[var(--stroke-glass)] px-4 py-3 transition-colors",
            "hover:border-[var(--stroke-cyan)] hover:bg-[rgba(0,212,255,0.04)]"
          )}
        >
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.08)]">
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus size={20} className="text-[var(--magenta-400)] opacity-70" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-[var(--text-1)]">Miniatura</span>
            <span className="mt-0.5 block text-xs text-[var(--text-3)]">
              PNG, JPG o WebP · máx. 2 MB. Si no subes nada, se usará el icono del catálogo.
            </span>
          </span>
        </label>
        <input
          id={fileId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />

        <Input
          id="create-spell-name"
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del conjuro"
          required
        />

        <div>
          <p className="mb-2 text-label">Tipo</p>
          <div className="grid grid-cols-2 gap-2">
            {SKILL_KINDS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                  kind === value
                    ? KIND_TONE[value]
                    : "border-[var(--stroke-glass)] text-[var(--text-2)] hover:border-[var(--stroke-cyan)]"
                )}
              >
                <span className="block font-medium">{SKILL_KIND_LABEL[value]}</span>
              </button>
            ))}
          </div>
        </div>

        <Textarea
          id="create-spell-desc"
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué hace, cuándo se usa y cualquier regla que el jugador deba ver."
          rows={4}
        />

        {shownError && <p className="text-sm text-[var(--danger)]">{shownError}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="session" loading={busy}>
            <WandSparkles size={14} />
            {editing ? "Guardar cambios" : "Crear spell"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
