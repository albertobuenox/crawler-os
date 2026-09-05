"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { ChecklistProgress } from "@/components/dm/MasterFloatWindow";
import { useRealtimeTable } from "@/hooks/useSession";
import { checklistProgress, newChecklistItem, parseChecklistItems } from "@/lib/master-notes";
import { BRAND } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { DmChecklist, DmChecklistItem } from "@/lib/types";

const DEFAULT_SEED = "Preparar encuentro\nRepartir iniciativa\nDeclarar mobs";

export function ChecklistBoard({ sessionId, openCreate }: { sessionId: string; openCreate?: boolean }) {
  const supabase = createClient();
  const [lists, setLists] = useState<DmChecklist[]>([]);
  const [showForm, setShowForm] = useState(!!openCreate);
  const [title, setTitle] = useState("");
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DmChecklist | null>(null);

  const closeForm = useCallback(() => {
    if (busy) return;
    setShowForm(false);
    setFormError("");
  }, [busy]);

  function resetForm() {
    setTitle("");
    setSeed(DEFAULT_SEED);
    setPin(false);
    setFormError("");
  }

  useEffect(() => {
    if (!openCreate) return;
    resetForm();
    setShowForm(true);
  }, [openCreate]);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("dm_checklists")
      .select("*")
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setLists(((data as DmChecklist[]) ?? []).map((row) => ({ ...row, items: parseChecklistItems(row.items) })));
  }

  useEffect(() => {
    void load();
  }, [sessionId]);

  useRealtimeTable("dm_checklists", `session_id=eq.${sessionId}`, () => {
    void load();
  });

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("El Sistema no archiva listas sin título.");
      return;
    }
    setBusy(true);
    setFormError("");
    const items = seed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text) => newChecklistItem(text));
    const { error: insertError } = await supabase.from("dm_checklists").insert({
      session_id: sessionId,
      title: title.trim(),
      is_pinned: pin,
      items,
    });
    setBusy(false);
    if (insertError) {
      setFormError(insertError.message);
      return;
    }
    resetForm();
    setShowForm(false);
    void load();
  }

  async function persist(list: DmChecklist, patch: Partial<DmChecklist>) {
    const next = { ...list, ...patch, updated_at: new Date().toISOString() };
    setLists((current) => current.map((row) => (row.id === list.id ? next : row)));
    await supabase
      .from("dm_checklists")
      .update({
        title: next.title,
        is_pinned: next.is_pinned,
        items: next.items,
        updated_at: next.updated_at,
      })
      .eq("id", list.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label text-[var(--cyan-400)]">Listas de control</p>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Ancla una lista y márcala en vivo, con barra de progreso, desde cualquier pantalla.
          </p>
        </div>
        <Button
          variant="energy"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Nueva checklist
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      <Modal
        open={showForm}
        eyebrow={`${BRAND} — LISTAS`}
        title="Nueva checklist"
        subtitle="Queda en consola. Si la anclas, te perseguirá por toda la sesión."
        onClose={closeForm}
      >
        <form onSubmit={(e) => void createList(e)} className="space-y-5">
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lo que no puedes dejar a medias"
            autoFocus
            required
          />
          <Textarea
            label="Ítems"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="Uno por línea. El Sistema no numera por ti."
            rows={5}
          />
          <button
            type="button"
            onClick={() => setPin((v) => !v)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
              pin
                ? "border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)]"
                : "border-[var(--stroke-glass)] hover:border-[var(--stroke-cyan)]"
            )}
          >
            <Pin size={18} className={pin ? "text-[var(--cyan-400)]" : "text-[var(--text-4)]"} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[var(--text-1)]">Siempre visible</span>
              <span className="block text-xs text-[var(--text-3)]">
                Se ancla sobre la consola y se puede marcar en vivo.
              </span>
            </span>
            <span
              className={cn(
                "h-5 w-9 rounded-full p-0.5 transition-colors",
                pin ? "bg-[var(--cyan-400)]" : "bg-[rgba(255,255,255,0.12)]"
              )}
            >
              <span
                className={cn(
                  "block h-4 w-4 rounded-full bg-white transition-transform",
                  pin ? "translate-x-4" : "translate-x-0"
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
              <ListChecks size={14} />
              Guardar checklist
            </Button>
          </div>
        </form>
      </Modal>

      <div className="grid gap-3 lg:grid-cols-2">
        {lists.length === 0 && (
          <p className="well col-span-full px-4 py-8 text-center text-sm text-[var(--text-3)]">
            No hay listas. Ni siquiera una de la compra.
          </p>
        )}
        {lists.map((list) => {
          const progress = checklistProgress(list.items);
          return (
            <GlassPanel
              key={list.id}
              title={list.title}
              subtitle={list.is_pinned ? "Siempre visible" : "Solo en este módulo"}
              action={
                <button
                  type="button"
                  onClick={() => void persist(list, { is_pinned: !list.is_pinned })}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] text-[var(--cyan-400)] hover:bg-[rgba(255,255,255,0.05)]"
                  aria-label={list.is_pinned ? "Desanclar" : "Anclar"}
                >
                  {list.is_pinned ? <Pin size={16} /> : <PinOff size={16} />}
                </button>
              }
            >
              <ChecklistProgress done={progress.done} total={progress.total} className="mb-3" />
              <ul className="space-y-1.5">
                {list.items.map((item) => (
                  <ChecklistEditorRow
                    key={item.id}
                    item={item}
                    onToggle={() =>
                      void persist(list, {
                        items: list.items.map((row) => (row.id === item.id ? { ...row, done: !row.done } : row)),
                      })
                    }
                    onRename={(text) =>
                      void persist(list, {
                        items: list.items.map((row) => (row.id === item.id ? { ...row, text } : row)),
                      })
                    }
                    onRemove={() => void persist(list, { items: list.items.filter((row) => row.id !== item.id) })}
                  />
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="neon"
                  size="sm"
                  onClick={() => void persist(list, { items: [...list.items, newChecklistItem("Nuevo punto")] })}
                >
                  <Plus size={14} /> Ítem
                </Button>
                <Button variant="danger" size="sm" onClick={() => setPendingDelete(list)}>
                  <Trash2 size={14} /> Borrar lista
                </Button>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="¿Borrar esta checklist?"
        body="La ventana flotante también se cierra."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await supabase.from("dm_checklists").delete().eq("id", pendingDelete.id);
          setLists((current) => current.filter((row) => row.id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function ChecklistEditorRow({
  item,
  onToggle,
  onRename,
  onRemove,
}: {
  item: DmChecklistItem;
  onToggle: () => void;
  onRename: (text: string) => void;
  onRemove: () => void;
}) {
  const [text, setText] = useState(item.text);

  useEffect(() => {
    setText(item.text);
  }, [item.text]);

  return (
    <li className="flex items-center gap-2">
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={item.done} onChange={onToggle} className="accent-[var(--cyan-400)]" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== item.text) onRename(text);
          }}
          className={cn(
            "h-8 min-w-0 flex-1 bg-transparent text-sm outline-none",
            item.done && "text-[var(--text-4)] line-through"
          )}
        />
      </label>
      <button
        type="button"
        aria-label="Quitar ítem"
        onClick={onRemove}
        className="text-[var(--text-4)] hover:text-[var(--danger)]"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}
