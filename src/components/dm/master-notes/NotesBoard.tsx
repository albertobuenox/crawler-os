"use client";

import { useCallback, useEffect, useState } from "react";
import { Pin, PinOff, Save, StickyNote, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { useRealtimeTable } from "@/hooks/useSession";
import { BRAND } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { DmNote } from "@/lib/types";

export function NotesBoard({ sessionId, openCreate }: { sessionId: string; openCreate?: boolean }) {
  const supabase = createClient();
  const [notes, setNotes] = useState<DmNote[]>([]);
  const [showForm, setShowForm] = useState(!!openCreate);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [reminder, setReminder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DmNote | null>(null);

  const closeForm = useCallback(() => {
    if (busy) return;
    setShowForm(false);
    setFormError("");
  }, [busy]);

  useEffect(() => {
    if (!openCreate) return;
    setShowForm(true);
    setTitle("");
    setBody("");
    setReminder(false);
    setFormError("");
  }, [openCreate]);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("dm_notes")
      .select("*")
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setNotes((data as DmNote[]) ?? []);
  }

  useEffect(() => {
    void load();
  }, [sessionId]);

  useRealtimeTable("dm_notes", `session_id=eq.${sessionId}`, () => {
    void load();
  });

  async function createNote(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("El Sistema no archiva notas sin título.");
      return;
    }
    setBusy(true);
    setFormError("");
    const { error: insertError } = await supabase.from("dm_notes").insert({
      session_id: sessionId,
      title: title.trim(),
      body: body.trim(),
      is_reminder: reminder,
    });
    setBusy(false);
    if (insertError) {
      setFormError(insertError.message);
      return;
    }
    setTitle("");
    setBody("");
    setReminder(false);
    setShowForm(false);
    void load();
  }

  async function toggleReminder(note: DmNote) {
    await supabase
      .from("dm_notes")
      .update({ is_reminder: !note.is_reminder, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label text-[var(--gold-400)]">Cuaderno del Master</p>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Ancla un recordatorio y te perseguirá por toda la consola, flotante y arrastrable.
          </p>
        </div>
        <Button
          variant="energy"
          onClick={() => {
            setTitle("");
            setBody("");
            setReminder(false);
            setFormError("");
            setShowForm(true);
          }}
        >
          Nueva nota
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <Modal
        open={showForm}
        eyebrow={`${BRAND} — CUADERNO`}
        title="Nueva nota"
        subtitle="Queda en consola. Si la anclas, te perseguirá por toda la sesión."
        onClose={closeForm}
      >
        <form onSubmit={(e) => void createNote(e)} className="space-y-5">
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lo que no puedes olvidar"
            autoFocus
            required
          />
          <Textarea
            label="Contenido"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Detalle, pista, amenaza o burla del Sistema."
            rows={5}
          />
          <button
            type="button"
            onClick={() => setReminder((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
              reminder
                ? "border-[var(--stroke-reward)] bg-[rgba(251,191,36,0.08)]"
                : "border-[var(--stroke-glass)] hover:border-[var(--stroke-cyan)]"
            )}
          >
            <Pin size={18} className={reminder ? "text-[var(--gold-400)]" : "text-[var(--text-4)]"} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[var(--text-1)]">Recordatorio flotante</span>
              <span className="block text-xs text-[var(--text-3)]">
                Se ancla sobre la consola y se puede arrastrar.
              </span>
            </span>
            <span
              className={cn(
                "h-5 w-9 rounded-full p-0.5 transition-colors",
                reminder ? "bg-[var(--gold-400)]" : "bg-[rgba(255,255,255,0.12)]"
              )}
            >
              <span
                className={cn(
                  "block h-4 w-4 rounded-full bg-white transition-transform",
                  reminder ? "translate-x-4" : "translate-x-0"
                )}
              />
            </span>
          </button>
          {formError && <p className="text-sm text-[var(--danger)]">{formError}</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={busy} onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" variant="session" loading={busy}>
              <StickyNote size={14} />
              Guardar nota
            </Button>
          </div>
        </form>
      </Modal>

      <div className="grid gap-3 lg:grid-cols-2">
        {notes.length === 0 && (
          <p className="well col-span-full px-4 py-8 text-center text-sm text-[var(--text-3)]">
            El Master aún no ha escrito nada. El piso sigue sin secretos.
          </p>
        )}
        {notes.map((note) => (
          <GlassPanel
            key={note.id}
            title={note.title}
            subtitle={note.is_reminder ? "Recordatorio anclado" : "Nota de consola"}
            action={
              <button
                type="button"
                onClick={() => void toggleReminder(note)}
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--gold-400)] hover:bg-[rgba(255,255,255,0.05)]"
                aria-label={note.is_reminder ? "Quitar recordatorio" : "Anclar recordatorio"}
              >
                {note.is_reminder ? <Pin size={16} /> : <PinOff size={16} />}
              </button>
            }
          >
            <NoteEditor note={note} onSaved={() => void load()} onDelete={() => setPendingDelete(note)} />
          </GlassPanel>
        ))}
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="¿Borrar esta nota?"
        body="El recordatorio flotante también desaparece."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await supabase.from("dm_notes").delete().eq("id", pendingDelete.id);
          setNotes((current) => current.filter((row) => row.id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function NoteEditor({
  note,
  onSaved,
  onDelete,
}: {
  note: DmNote;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
    setSaveError("");
  }, [note.id, note.title, note.body]);

  const dirty = title !== note.title || body !== note.body;

  async function save() {
    if (!dirty || busy) return;
    setBusy(true);
    setSaveError("");
    const { error: updateError } = await supabase
      .from("dm_notes")
      .update({ title: title.trim() || note.title, body, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    setBusy(false);
    if (updateError) {
      setSaveError(updateError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-3">
      <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Contenido" value={body} onChange={(e) => setBody(e.target.value)} />
      {saveError && <p className="text-sm text-[var(--danger)]">{saveError}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="session" size="sm" disabled={!dirty} loading={busy} onClick={() => void save()}>
          <Save size={14} />
          Guardar cambios
        </Button>
        <Button variant="danger" size="sm" disabled={busy} onClick={onDelete}>
          <Trash2 size={14} /> Borrar
        </Button>
      </div>
    </div>
  );
}
