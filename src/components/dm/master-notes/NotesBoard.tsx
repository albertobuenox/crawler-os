"use client";

import { useEffect, useState } from "react";
import { Pin, PinOff, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useRealtimeTable } from "@/hooks/useSession";
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
  const [pendingDelete, setPendingDelete] = useState<DmNote | null>(null);

  useEffect(() => {
    if (openCreate) setShowForm(true);
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
    setBusy(true);
    setError("");
    const { error: insertError } = await supabase.from("dm_notes").insert({
      session_id: sessionId,
      title: title.trim(),
      body: body.trim(),
      is_reminder: reminder,
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
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
        <Button variant="energy" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Nueva nota"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {showForm && (
        <GlassPanel title="Nueva nota">
          <form onSubmit={(e) => void createNote(e)} className="grid gap-4">
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Textarea label="Contenido" value={body} onChange={(e) => setBody(e.target.value)} />
            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} />
              Marcar como recordatorio flotante
            </label>
            <Button type="submit" variant="session" loading={busy}>
              Guardar nota
            </Button>
          </form>
        </GlassPanel>
      )}

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
            <NoteEditor note={note} onSaved={() => void load()} />
            <div className="mt-3 flex justify-end">
              <Button variant="danger" size="sm" onClick={() => setPendingDelete(note)}>
                <Trash2 size={14} /> Borrar
              </Button>
            </div>
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

function NoteEditor({ note, onSaved }: { note: DmNote; onSaved: () => void }) {
  const supabase = createClient();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

  useEffect(() => {
    setTitle(note.title);
    setBody(note.body);
  }, [note.id, note.title, note.body]);

  async function save() {
    if (title === note.title && body === note.body) return;
    await supabase
      .from("dm_notes")
      .update({ title: title.trim() || note.title, body, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    onSaved();
  }

  return (
    <div className="space-y-3">
      <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => void save()} />
      <Textarea label="Contenido" value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => void save()} />
    </div>
  );
}
