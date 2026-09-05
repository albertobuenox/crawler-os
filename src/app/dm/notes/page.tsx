"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, ListChecks, Skull, StickyNote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NotificationStudio } from "@/components/dm/master-notes/NotificationStudio";
import { NotesBoard } from "@/components/dm/master-notes/NotesBoard";
import { ChecklistBoard } from "@/components/dm/master-notes/ChecklistBoard";
import { MobWorkshop } from "@/components/dm/master-notes/MobWorkshop";
import { DM_OPEN_CREATE } from "@/hooks/useDmDeepLink";
import type { CreateKind } from "@/lib/command-palette";
import { parseMasterTab, type MasterNotesTab } from "@/lib/master-notes";
import { castSession, cn } from "@/lib/utils";
import type { GameSession } from "@/lib/types";

const TABS: { id: MasterNotesTab; label: string; icon: typeof Bell }[] = [
  { id: "notifications", label: "Notificaciones", icon: Bell },
  { id: "notes", label: "Notas", icon: StickyNote },
  { id: "checklists", label: "Checklists", icon: ListChecks },
  { id: "mobs", label: "Mobs", icon: Skull },
];

type PlayerOpt = { id: string; name: string; owner_user_id: string | null };

export default function DMMasterNotesPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [tab, setTab] = useState<MasterNotesTab>("notifications");
  const [createFor, setCreateFor] = useState<MasterNotesTab | null>(null);

  const openTab = useCallback((next: MasterNotesTab) => {
    setTab(next);
    setCreateFor(next);
  }, []);

  useEffect(() => {
    function onEvent(event: Event) {
      const kind = (event as CustomEvent<{ kind?: CreateKind }>).detail?.kind;
      if (kind === "notification") openTab("notifications");
      if (kind === "note") openTab("notes");
      if (kind === "checklist") openTab("checklists");
      if (kind === "mob") openTab("mobs");
    }
    window.addEventListener(DM_OPEN_CREATE, onEvent);
    return () => window.removeEventListener(DM_OPEN_CREATE, onEvent);
  }, [openTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = parseMasterTab(params.get("tab"));
    setTab(next);
    if (params.get("new") === "1") setCreateFor(next);
  }, []);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase
      .from("session_members")
      .select("sessions(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sess = castSession(member?.sessions);
    setSession(sess ?? null);
    if (!sess) return;
    const { data: roster } = await supabase
      .from("crawlers")
      .select("id, name, owner_user_id")
      .eq("session_id", sess.id)
      .order("name");
    setPlayers((roster as PlayerOpt[]) ?? []);
  }

  function selectTab(next: MasterNotesTab) {
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", next);
    params.delete("new");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-label text-[var(--cyan-400)]">SYSTEM / MASTER / NOTAS</p>
        <h2 className="mt-1 font-display text-xl tracking-wide">Notas del Master</h2>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-3)]">
          Avisos para los crawlers, recordatorios flotantes, listas vivas y un bestiario para el lienzo.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTab(id)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-[12px] border px-3 font-display text-[11px] tracking-wide",
                active
                  ? "border-[var(--stroke-cyan-hot)] text-[var(--cyan-300)] shadow-[var(--glow-cyan)]"
                  : "border-[var(--stroke-glass)] text-[var(--text-2)] hover:text-[var(--text-1)]"
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {!session && (
        <p className="well px-4 py-10 text-center text-sm text-[var(--text-3)]">
          No hay sesión activa. El dungeon está aburrido.
        </p>
      )}

      {session && tab === "notifications" && (
        <NotificationStudio
          sessionId={session.id}
          players={players}
          openCreate={createFor === "notifications"}
        />
      )}
      {session && tab === "notes" && <NotesBoard sessionId={session.id} openCreate={createFor === "notes"} />}
      {session && tab === "checklists" && (
        <ChecklistBoard sessionId={session.id} openCreate={createFor === "checklists"} />
      )}
      {session && tab === "mobs" && <MobWorkshop sessionId={session.id} openCreate={createFor === "mobs"} />}
    </div>
  );
}
