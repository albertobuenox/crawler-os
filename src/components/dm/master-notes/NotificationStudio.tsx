"use client";

import { useEffect, useState } from "react";
import { Bell, Send, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { NOTIFICATION_TYPE_LABEL, NOTIFICATION_TYPES } from "@/lib/master-notes";
import type { DmNotificationDraft, NotificationType } from "@/lib/types";

type PlayerOpt = { id: string; name: string; owner_user_id: string | null };

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
  const [ok, setOk] = useState("");
  const [pendingDelete, setPendingDelete] = useState<DmNotificationDraft | null>(null);
  const [showForm, setShowForm] = useState(!!openCreate);

  useEffect(() => {
    if (openCreate) setShowForm(true);
  }, [openCreate]);

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
    setDrafts((data as DmNotificationDraft[]) ?? []);
  }

  async function generateDraft(e: React.FormEvent) {
    e.preventDefault();
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
      setError(insertError?.message || "El Sistema rechazó el borrador.");
      return;
    }
    setDrafts((current) => [data as DmNotificationDraft, ...current]);
    setTitle("");
    setBody("");
    setShowForm(false);
    setOk("Notificación generada. Decidí destinatario, copias y si la sueltas o la guardas.");
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
        <Button variant="energy" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancelar" : "Generar notificación"}
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

      {showForm && (
        <GlassPanel title="Nueva notificación" subtitle="Esto es lo que verán en el menú de avisos">
          <form onSubmit={(e) => void generateDraft(e)} className="grid gap-4 lg:grid-cols-2">
            <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Select
              label="Tipo"
              value={type}
              onChange={(e) => setType(e.target.value as NotificationType)}
              options={NOTIFICATION_TYPES.map((value) => ({ value, label: NOTIFICATION_TYPE_LABEL[value] }))}
            />
            <Textarea
              label="Cuerpo"
              className="lg:col-span-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit" variant="session" loading={busy}>
              Generar y almacenar
            </Button>
          </form>
        </GlassPanel>
      )}

      <div className="space-y-3">
        {drafts.length === 0 && (
          <p className="well px-4 py-8 text-center text-sm text-[var(--text-3)]">
            El buffer está vacío. El dungeon observa en silencio.
          </p>
        )}
        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            players={players}
            sessionId={sessionId}
            onAskDelete={() => setPendingDelete(draft)}
            onSent={(message) => {
              setOk(message);
              setError("");
            }}
            onError={setError}
            onPatch={(next) => setDrafts((current) => current.map((row) => (row.id === next.id ? next : row)))}
          />
        ))}
      </div>

      <ConfirmModal
        open={!!pendingDelete}
        title="¿Purgar este aviso?"
        body="Desaparece del buffer. Los que ya se enviaron se quedan en el menú de los crawlers."
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (!pendingDelete) return;
          await supabase.from("dm_notification_drafts").delete().eq("id", pendingDelete.id);
          setDrafts((current) => current.filter((row) => row.id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function DraftCard({
  draft,
  players,
  sessionId,
  onAskDelete,
  onSent,
  onError,
  onPatch,
}: {
  draft: DmNotificationDraft;
  players: PlayerOpt[];
  sessionId: string;
  onAskDelete: () => void;
  onSent: (message: string) => void;
  onError: (message: string) => void;
  onPatch: (draft: DmNotificationDraft) => void;
}) {
  const supabase = createClient();
  const [copies, setCopies] = useState(1);
  const [target, setTarget] = useState("all");
  const [type, setType] = useState<NotificationType>(draft.notification_type);
  const [sending, setSending] = useState(false);

  async function persistType(next: NotificationType) {
    setType(next);
    const { data } = await supabase
      .from("dm_notification_drafts")
      .update({ notification_type: next, updated_at: new Date().toISOString() })
      .eq("id", draft.id)
      .select("*")
      .single();
    if (data) onPatch(data as DmNotificationDraft);
  }

  async function send() {
    setSending(true);
    const targetUser = target === "all" ? null : target;
    const { data, error } = await supabase.rpc("send_master_notifications", {
      p_session_id: sessionId,
      p_notification_type: type,
      p_title: draft.title,
      p_body: draft.body,
      p_target_user_id: targetUser,
      p_copies: copies,
    });
    setSending(false);
    if (error) {
      onError(error.message);
      return;
    }
    onSent(`Enviadas ${data as number} copias. Siguen en el buffer por si las quieres repetir.`);
  }

  const targetOptions = [
    { value: "all", label: "Todos los jugadores" },
    ...players.map((player) => ({
      value: player.owner_user_id ?? "",
      label: player.owner_user_id ? player.name : `${player.name} — sin usuario`,
    })),
  ].filter((option) => option.value !== "" || option.label.startsWith("Todos"));

  return (
    <GlassPanel
      title={draft.title}
      subtitle={NOTIFICATION_TYPE_LABEL[draft.notification_type]}
      action={<Bell size={16} className="text-[var(--cyan-400)]" />}
    >
      {draft.body && <p className="mb-4 text-sm leading-relaxed text-[var(--text-2)]">{draft.body}</p>}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_6rem] md:items-end">
        <Select
          label="Tipo"
          value={type}
          onChange={(e) => void persistType(e.target.value as NotificationType)}
          options={NOTIFICATION_TYPES.map((value) => ({ value, label: NOTIFICATION_TYPE_LABEL[value] }))}
        />
        <Select label="Destinatario" value={target} onChange={(e) => setTarget(e.target.value)} options={targetOptions} />
        <Input
          label="Copias"
          type="number"
          min={1}
          max={20}
          value={copies}
          onChange={(e) => setCopies(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="energy" size="sm" loading={sending} onClick={() => void send()}>
          <Send size={14} /> Enviar ahora
        </Button>
        <Button variant="ghost" size="sm" onClick={onAskDelete}>
          <Trash2 size={14} /> Purgar
        </Button>
        <span className="self-center text-xs text-[var(--text-4)]">Almacenada. No se borra al enviar.</span>
      </div>
    </GlassPanel>
  );
}
