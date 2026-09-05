"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Check, Pencil, Search, Send, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
import { BRAND } from "@/lib/copy";
import { NOTIFICATION_TYPE_LABEL, NOTIFICATION_TYPES } from "@/lib/master-notes";
import { cn } from "@/lib/utils";
import type { DmNotificationDraft, NotificationType } from "@/lib/types";

type PlayerOpt = { id: string; name: string; owner_user_id: string | null };

type DraftDispatch = {
  type: NotificationType;
  target: string;
  copies: number;
};

function defaultDispatch(draft: DmNotificationDraft): DraftDispatch {
  return { type: draft.notification_type, target: "all", copies: 1 };
}

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function targetHaystack(target: string, players: PlayerOpt[]) {
  if (target === "all") return "todos los jugadores all everyone";
  const player = players.find((row) => row.owner_user_id === target);
  return player?.name ?? "";
}

function draftMatches(
  draft: DmNotificationDraft,
  dispatch: DraftDispatch,
  players: PlayerOpt[],
  query: string
) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearch(
    [
      draft.title,
      draft.body ?? "",
      NOTIFICATION_TYPE_LABEL[draft.notification_type],
      NOTIFICATION_TYPE_LABEL[dispatch.type],
      targetHaystack(dispatch.target, players),
    ].join(" ")
  );
  return words.every((word) => haystack.includes(word));
}

export function NotificationStudio({
  sessionId,
  players,
  openCreate,
}: {
  sessionId: string;
  players: PlayerOpt[];
  openCreate?: boolean;
}) {
  const supabase = createClient();
  const [drafts, setDrafts] = useState<DmNotificationDraft[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("system");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [ok, setOk] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DmNotificationDraft | null>(null);
  const [showForm, setShowForm] = useState(!!openCreate);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dispatchById, setDispatchById] = useState<Record<string, DraftDispatch>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [batchSending, setBatchSending] = useState(false);
  const [query, setQuery] = useState("");

  const closeForm = useCallback(() => {
    if (busy) return;
    setShowForm(false);
    setFormError("");
  }, [busy]);

  const resetForm = useCallback(() => {
    setTitle("");
    setBody("");
    setType("system");
    setFormError("");
  }, []);

  useEffect(() => {
    if (!openCreate) return;
    resetForm();
    setShowForm(true);
  }, [openCreate, resetForm]);

  useEffect(() => {
    void load();
  }, [sessionId]);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("dm_notification_drafts")
      .select("*")
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    const next = (data as DmNotificationDraft[]) ?? [];
    setDrafts(next);
    setDispatchById((current) => syncDispatch(current, next));
    setSelectedIds((current) => current.filter((id) => next.some((draft) => draft.id === id)));
  }

  async function generateDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("El Sistema no genera avisos sin título.");
      return;
    }
    setFormError("");
    setError("");
    setOk("");
    setBusy(true);
    const { data, error: insertError } = await supabase
      .from("dm_notification_drafts")
      .insert({
        session_id: sessionId,
        notification_type: type,
        title: title.trim(),
        body: body.trim() || null,
        payload: {},
      })
      .select("*")
      .single();
    setBusy(false);
    if (insertError || !data) {
      setFormError(insertError?.message || "El Sistema rechazó el borrador.");
      return;
    }
    const created = data as DmNotificationDraft;
    setDrafts((current) => [created, ...current]);
    setDispatchById((current) => ({ ...current, [created.id]: defaultDispatch(created) }));
    resetForm();
    setShowForm(false);
    setOk("Notificación generada. Decidí destinatario, copias y si la sueltas o la guardas.");
  }

  function patchDispatch(id: string, patch: Partial<DraftDispatch>) {
    setDispatchById((current) => ({
      ...current,
      [id]: { ...(current[id] ?? { type: "system", target: "all", copies: 1 }), ...patch },
    }));
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((row) => row !== id) : [...current, id]
    );
  }

  const filtered = useMemo(
    () =>
      drafts.filter((draft) =>
        draftMatches(draft, dispatchById[draft.id] ?? defaultDispatch(draft), players, query)
      ),
    [drafts, dispatchById, players, query]
  );

  const visibleIds = useMemo(() => filtered.map((draft) => draft.id), [filtered]);
  const allSelected = filtered.length > 0 && filtered.every((draft) => selectedIds.includes(draft.id));
  const hasQuery = query.trim().length > 0;

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function sendDraft(draft: DmNotificationDraft) {
    const config = dispatchById[draft.id] ?? defaultDispatch(draft);
    const targetUser = config.target === "all" ? null : config.target;
    const { data, error: sendError } = await supabase.rpc("send_master_notifications", {
      p_session_id: sessionId,
      p_notification_type: config.type,
      p_title: draft.title,
      p_body: draft.body,
      p_target_user_id: targetUser,
      p_copies: config.copies,
    });
    if (sendError) throw new Error(sendError.message);
    return data as number;
  }

  async function sendOne(draft: DmNotificationDraft) {
    setSendingId(draft.id);
    setError("");
    setOk("");
    try {
      const copies = await sendDraft(draft);
      setOk(`Enviadas ${copies} copias. Siguen en el buffer por si las quieres repetir.`);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "El Sistema no soltó el aviso.");
    } finally {
      setSendingId(null);
    }
  }

  async function sendSelected() {
    const queue = drafts.filter((draft) => selectedIds.includes(draft.id));
    if (queue.length === 0) return;
    setBatchSending(true);
    setError("");
    setOk("");
    let total = 0;
    const failed: string[] = [];
    for (const draft of queue) {
      try {
        total += await sendDraft(draft);
      } catch {
        failed.push(draft.title);
      }
    }
    setBatchSending(false);
    if (failed.length > 0) {
      setError(`No salieron: ${failed.join(" · ")}`);
    }
    if (total > 0) {
      const sent = queue.length - failed.length;
      setOk(
        sent === 1
          ? `Enviada 1 notificación (${total} copias). Siguen en el buffer.`
          : `Enviadas ${sent} notificaciones de golpe (${total} copias). Siguen en el buffer.`
      );
      setSelectedIds([]);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label text-[var(--cyan-400)]">Buffer del Sistema</p>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Genera el aviso, elige a quién y cuántas copias. O déjalo almacenado para más tarde.
          </p>
        </div>
        <Button
          variant="energy"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          Generar notificación
        </Button>
      </div>

      {error && (
        <p className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl border border-[var(--stroke-cyan)] bg-[var(--glass-cyan)] px-3 py-2 text-sm text-[var(--cyan-300)]">
          {ok}
        </p>
      )}

      <Modal
        open={showForm}
        eyebrow={`${BRAND} — SISTEMA`}
        title="Generar notificación"
        subtitle="Queda en el buffer. Tú decides destinatario, copias y el momento de soltarla."
        action={<Bell size={18} className="text-[var(--cyan-400)]" />}
        onClose={closeForm}
      >
        <form onSubmit={(e) => void generateDraft(e)} className="space-y-5">
          <Input
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Lo que verán en el menú de avisos"
            autoFocus
            required
          />
          <Select
            label="Tipo"
            value={type}
            onChange={(e) => setType(e.target.value as NotificationType)}
            options={NOTIFICATION_TYPES.map((value) => ({
              value,
              label: NOTIFICATION_TYPE_LABEL[value],
            }))}
          />
          <Textarea
            label="Cuerpo"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Detalle, amenaza, recompensa o burla del Sistema."
            rows={5}
          />
          {formError && <p className="text-sm text-[var(--danger)]">{formError}</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={busy} onClick={closeForm}>
              Cancelar
            </Button>
            <Button type="submit" variant="session" loading={busy}>
              <Bell size={14} />
              Generar y almacenar
            </Button>
          </div>
        </form>
      </Modal>

      {drafts.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-4)]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Filtrar por nombre, descripción o destinatario"
              aria-label="Filtrar notificaciones por nombre, descripción o destinatario"
              className="well h-11 w-full pl-9 pr-10 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)] focus:border-[var(--stroke-cyan-hot)] focus:shadow-[var(--glow-cyan)]"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpiar filtro"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-4)]">
              {hasQuery
                ? filtered.length === 1
                  ? "1 aviso coincide con el filtro."
                  : `${filtered.length} avisos coinciden con el filtro.`
                : selectedIds.length === 0
                  ? "Marca avisos para enviarlos de golpe."
                  : selectedIds.length === 1
                    ? "1 aviso marcado. El botón flotante los suelta todos."
                    : `${selectedIds.length} avisos marcados. El botón flotante los suelta todos.`}
            </p>
            {filtered.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                {allSelected ? "Quitar marcas" : hasQuery ? "Marcar visibles" : "Marcar todas"}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", selectedIds.length > 0 && "pb-24")}>
        {drafts.length === 0 && (
          <p className="well col-span-full px-4 py-8 text-center text-sm text-[var(--text-3)]">
            El buffer está vacío. El dungeon observa en silencio.
          </p>
        )}
        {drafts.length > 0 && filtered.length === 0 && (
          <p className="well col-span-full px-4 py-8 text-center text-sm text-[var(--text-3)]">
            Ningún aviso coincide con “{query.trim()}”.
          </p>
        )}
        {filtered.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            players={players}
            selected={selectedIds.includes(draft.id)}
            dispatch={dispatchById[draft.id] ?? defaultDispatch(draft)}
            sending={sendingId === draft.id || (batchSending && selectedIds.includes(draft.id))}
            onToggleSelect={() => toggleSelected(draft.id)}
            onAskDelete={() => setPendingDelete(draft)}
            onDispatchChange={(patch) => patchDispatch(draft.id, patch)}
            onSend={() => void sendOne(draft)}
            onPatch={(next) => {
              setDrafts((current) => current.map((row) => (row.id === next.id ? next : row)));
              patchDispatch(next.id, { type: next.notification_type });
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-6 right-6 z-[var(--z-overlay)] flex items-center gap-2"
          >
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={batchSending}
              className="rounded-full border border-[var(--stroke-glass)] bg-[rgba(5,6,13,0.88)] px-3 py-2 text-xs text-[var(--text-3)] shadow-[var(--shadow-glass)] backdrop-blur-xl transition-colors hover:border-[var(--stroke-cyan)] hover:text-[var(--text-1)] disabled:opacity-45"
            >
              Quitar marcas
            </button>
            <Button variant="energy" size="lg" loading={batchSending} onClick={() => void sendSelected()}>
              <Send size={16} />
              Enviar {selectedIds.length === 1 ? "aviso" : `${selectedIds.length} avisos`}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!pendingDelete}
        title="¿Purgar este aviso?"
        body="Desaparece del buffer. Los que ya se enviaron se quedan en el menú de los crawlers."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await supabase.from("dm_notification_drafts").delete().eq("id", pendingDelete.id);
          setDrafts((current) => current.filter((row) => row.id !== pendingDelete.id));
          setSelectedIds((current) => current.filter((id) => id !== pendingDelete.id));
          setDispatchById((current) => {
            const next = { ...current };
            delete next[pendingDelete.id];
            return next;
          });
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function syncDispatch(
  current: Record<string, DraftDispatch>,
  drafts: DmNotificationDraft[]
): Record<string, DraftDispatch> {
  const next: Record<string, DraftDispatch> = {};
  let changed = Object.keys(current).length !== drafts.length;
  for (const draft of drafts) {
    next[draft.id] = current[draft.id] ?? defaultDispatch(draft);
    if (!current[draft.id]) changed = true;
  }
  return changed ? next : current;
}

function DraftCard({
  draft,
  players,
  selected,
  dispatch,
  sending,
  onToggleSelect,
  onAskDelete,
  onDispatchChange,
  onSend,
  onPatch,
}: {
  draft: DmNotificationDraft;
  players: PlayerOpt[];
  selected: boolean;
  dispatch: DraftDispatch;
  sending: boolean;
  onToggleSelect: () => void;
  onAskDelete: () => void;
  onDispatchChange: (patch: Partial<DraftDispatch>) => void;
  onSend: () => void;
  onPatch: (draft: DmNotificationDraft) => void;
}) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(draft.title);
  const [editBody, setEditBody] = useState(draft.body ?? "");
  const [editType, setEditType] = useState<NotificationType>(draft.notification_type);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const targetOptions = useMemo(
    () =>
      [
        { value: "all", label: "Todos los jugadores" },
        ...players.map((player) => ({
          value: player.owner_user_id ?? "",
          label: player.owner_user_id ? player.name : `${player.name} — sin usuario`,
        })),
      ].filter((option) => option.value !== "" || option.label.startsWith("Todos")),
    [players]
  );

  function openEdit() {
    setEditTitle(draft.title);
    setEditBody(draft.body ?? "");
    setEditType(draft.notification_type);
    setEditError("");
    setEditing(true);
  }

  function closeEdit() {
    if (saving) return;
    setEditing(false);
    setEditError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) {
      setEditError("El Sistema no genera avisos sin título.");
      return;
    }
    setEditError("");
    setSaving(true);
    const { data, error } = await supabase
      .from("dm_notification_drafts")
      .update({
        title: editTitle.trim(),
        body: editBody.trim() || null,
        notification_type: editType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draft.id)
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      setEditError(error?.message || "El Sistema rechazó el cambio.");
      return;
    }
    onPatch(data as DmNotificationDraft);
    setEditing(false);
  }

  return (
    <>
      <GlassPanel
        className={cn(
          "flex h-full flex-col transition-[border-color,box-shadow]",
          selected && "!border-[var(--stroke-cyan-hot)] shadow-[var(--glow-cyan)]"
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="line-clamp-2 font-display text-sm font-bold tracking-[0.06em] text-[var(--text-1)]">
              {draft.title}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-cyan)]">
              {NOTIFICATION_TYPE_LABEL[draft.notification_type]}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SelectMark
              checked={selected}
              label={selected ? `Quitar ${draft.title} del envío` : `Marcar ${draft.title} para enviar`}
              onChange={onToggleSelect}
            />
            <button
              type="button"
              onClick={openEdit}
              aria-label={`Editar ${draft.title}`}
              className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-[var(--stroke-glass)] text-[var(--cyan-400)] transition-colors hover:border-[var(--stroke-cyan)] hover:bg-[rgba(0,212,255,0.08)]"
            >
              <Pencil size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        <p
          className={cn(
            "mb-4 min-h-[3.75rem] flex-1 text-sm leading-relaxed",
            draft.body ? "line-clamp-4 text-[var(--text-2)]" : "text-[var(--text-4)]"
          )}
        >
          {draft.body || "Sin descripción. El Sistema guarda silencio."}
        </p>
        <div className="mt-auto grid gap-3 sm:grid-cols-[minmax(0,1fr)_5.5rem] sm:items-end">
          <Select
            id={`dest-${draft.id}`}
            label="Destinatario"
            value={dispatch.target}
            onChange={(e) => onDispatchChange({ target: e.target.value })}
            options={targetOptions}
          />
          <Input
            id={`copies-${draft.id}`}
            label="Copias"
            type="number"
            min={1}
            max={20}
            value={dispatch.copies}
            onChange={(e) =>
              onDispatchChange({ copies: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })
            }
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="energy" size="sm" loading={sending} onClick={onSend}>
            <Send size={14} /> Enviar
          </Button>
          <Button variant="ghost" size="sm" onClick={onAskDelete}>
            <Trash2 size={14} /> Purgar
          </Button>
        </div>
      </GlassPanel>

      <Modal
        open={editing}
        eyebrow={`${BRAND} — SISTEMA`}
        title="Editar notificación"
        subtitle="Cambia el título, el tipo o lo que leerán los crawlers."
        action={<Pencil size={18} className="text-[var(--cyan-400)]" />}
        onClose={closeEdit}
      >
        <form onSubmit={(e) => void saveEdit(e)} className="space-y-5">
          <Input
            id={`edit-title-${draft.id}`}
            label="Título"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Lo que verán en el menú de avisos"
            autoFocus
            required
          />
          <Select
            id={`edit-type-${draft.id}`}
            label="Tipo"
            value={editType}
            onChange={(e) => setEditType(e.target.value as NotificationType)}
            options={NOTIFICATION_TYPES.map((value) => ({
              value,
              label: NOTIFICATION_TYPE_LABEL[value],
            }))}
          />
          <Textarea
            id={`edit-body-${draft.id}`}
            label="Cuerpo"
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            placeholder="Detalle, amenaza, recompensa o burla del Sistema."
            rows={5}
          />
          {editError && <p className="text-sm text-[var(--danger)]">{editError}</p>}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" disabled={saving} onClick={closeEdit}>
              Cancelar
            </Button>
            <Button type="submit" variant="session" loading={saving}>
              <Pencil size={14} />
              Guardar cambios
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function SelectMark({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[9px] border transition-colors",
        checked
          ? "border-[var(--stroke-cyan-hot)] bg-[var(--glass-cyan)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
          : "border-[var(--stroke-glass)] text-[var(--text-4)] hover:border-[var(--stroke-cyan)] hover:text-[var(--cyan-400)]"
      )}
    >
      <Check size={14} strokeWidth={2.5} className={checked ? "opacity-100" : "opacity-0"} />
    </button>
  );
}
