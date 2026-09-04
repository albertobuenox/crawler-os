"use client";

import { useEffect, useId, useState } from "react";
import { ImagePlus, PawPrint, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { SkillThumb } from "@/components/hud/SkillThumb";
import { BRAND, SKILL_KIND_LABEL } from "@/lib/copy";
import { defaultSkillType, isSkillKind, SKILL_KINDS } from "@/lib/skills";
import type { SkillCatalogEntry, SkillKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND_TONE: Record<SkillKind, string> = {
  ataque: "border-[var(--stroke-reward)] bg-[rgba(249,115,22,0.12)] text-[var(--orange-400)]",
  defensa: "border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.1)] text-[var(--cyan-400)]",
  apoyo: "border-[var(--stroke-reward)] bg-[rgba(251,191,36,0.1)] text-[var(--gold-400)]",
  destreza: "border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.1)] text-[var(--magenta-400)]",
};

interface CreateSkillModalProps {
  open: boolean;
  editing?: SkillCatalogEntry | null;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    kind: SkillKind;
    animal_only: boolean;
    thumb?: File | null;
  }) => void;
}

export function CreateSkillModal({
  open,
  editing,
  busy = false,
  error = "",
  onClose,
  onSubmit,
}: CreateSkillModalProps) {
  const fileId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<SkillKind>("ataque");
  const [animalOnly, setAnimalOnly] = useState(false);
  const [thumb, setThumb] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setKind(editing?.kind && isSkillKind(editing.kind) ? editing.kind : "ataque");
    setAnimalOnly(editing?.animal_only ?? false);
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
      setLocalError("Ponle un nombre a la skill.");
      return;
    }
    if (!editing && !description.trim()) {
      setLocalError("Todas las habilidades necesitan una descripción.");
      return;
    }
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      kind,
      animal_only: animalOnly,
      thumb,
    });
  }

  const shownError = localError || error;
  const previewSrc = preview ?? editing?.thumb_url ?? null;

  return (
    <Modal
      open={open}
      eyebrow={`${BRAND} — CATÁLOGO`}
      title={editing ? `Editar ${editing.name}` : "Nueva skill"}
      subtitle="Nombre, tipo, descripción y miniatura. El resto se asigna al crawler."
      action={
        editing && !previewSrc ? (
          <SkillThumb slug={editing.slug} skillType={defaultSkillType(editing)} thumbUrl={editing.thumb_url} size="md" />
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
          id="create-skill-name"
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la habilidad"
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
          id="create-skill-desc"
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Qué hace, cuándo se usa y cualquier regla que el jugador deba ver."
          rows={4}
        />

        <button
          type="button"
          onClick={() => setAnimalOnly((v) => !v)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
            animalOnly
              ? "border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.08)]"
              : "border-[var(--stroke-glass)] hover:border-[var(--stroke-cyan)]"
          )}
        >
          <PawPrint
            size={18}
            className={animalOnly ? "text-[var(--magenta-400)]" : "text-[var(--text-4)]"}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-[var(--text-1)]">Solo animal</span>
            <span className="block text-xs text-[var(--text-3)]">
              Queda marcada para crawlers con forma animal.
            </span>
          </span>
          <span
            className={cn(
              "h-5 w-9 rounded-full p-0.5 transition-colors",
              animalOnly ? "bg-[var(--magenta-500)]" : "bg-[rgba(255,255,255,0.12)]"
            )}
          >
            <span
              className={cn(
                "block h-4 w-4 rounded-full bg-white transition-transform",
                animalOnly ? "translate-x-4" : "translate-x-0"
              )}
            />
          </span>
        </button>

        {shownError && <p className="text-sm text-[var(--danger)]">{shownError}</p>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="session" loading={busy}>
            <Sparkles size={14} />
            {editing ? "Guardar cambios" : "Crear skill"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
