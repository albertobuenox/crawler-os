"use client";

import { useEffect, useState } from "react";
import { Pin, PinOff, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ChecklistProgress } from "@/components/dm/MasterFloatWindow";
import { useRealtimeTable } from "@/hooks/useSession";
import { checklistProgress, newChecklistItem, parseChecklistItems } from "@/lib/master-notes";
import { cn } from "@/lib/utils";
import type { DmChecklist, DmChecklistItem } from "@/lib/types";

export function ChecklistBoard({ sessionId, openCreate }: { sessionId: string; openCreate?: boolean }) {
  const supabase = createClient();
  const [lists, setLists] = useState<DmChecklist[]>([]);
  const [showForm, setShowForm] = useState(!!openCreate);
  const [title, setTitle] = useState("");
  const [seed, setSeed] = useState("Preparar encuentro\nRepartir iniciativa\nDeclarar mobs");
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DmChecklist | null>(null);

  useEffect(() => {
    if (openCreate) setShowForm(true);
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
    setBusy(true);
    setError("");
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
      setError(insertError.message);
      return;
    }
    setTitle("");
    setSeed("");
    setPin(false);
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
        <Button variant="energy" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Nueva checklist"}
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {showForm && (
        <GlassPanel title="Nueva checklist">
          <form onSubmit={(e) => void createList(e)} className="grid gap-4">
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <label className="flex flex-col gap-1.5">
              <span className="text-label">Ítems (uno por línea)</span>
              <textarea
                className="well min-h-[110px] w-full resize-y px-3 py-2 text-sm outline-none focus:border-[var(--stroke-cyan-hot)] focus:shadow-[var(--glow-cyan)]"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} />
              Mantener siempre visible
            </label>
            <Button type="submit" variant="session" loading={busy}>
              Guardar checklist
            </Button>
          </form>
        </GlassPanel>
      )}

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
