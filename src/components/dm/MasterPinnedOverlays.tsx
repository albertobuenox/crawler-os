"use client";

import { useCallback, useEffect, useState } from "react";
import { ListChecks, StickyNote } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChecklistProgress, MasterFloatWindow } from "@/components/dm/MasterFloatWindow";
import { useRealtimeTable } from "@/hooks/useSession";
import { checklistProgress, parseChecklistItems } from "@/lib/master-notes";
import { castSession, cn } from "@/lib/utils";
import type { DmChecklist, DmChecklistItem, DmNote } from "@/lib/types";

function asNote(row: DmNote): DmNote {
  return row;
}

function asChecklist(row: DmChecklist): DmChecklist {
  return { ...row, items: parseChecklistItems(row.items) };
}

export function MasterPinnedOverlays() {
  const supabase = createClient();
  const [sessionId, setSessionId] = useState<string>();
  const [notes, setNotes] = useState<DmNote[]>([]);
  const [lists, setLists] = useState<DmChecklist[]>([]);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase
      .from("session_members")
      .select("session_id, sessions(*)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sess = castSession(member?.sessions);
    if (!sess) return;
    setSessionId(sess.id);
    const [{ data: noteRows }, { data: listRows }] = await Promise.all([
      supabase.from("dm_notes").select("*").eq("session_id", sess.id).eq("is_reminder", true).order("updated_at"),
      supabase.from("dm_checklists").select("*").eq("session_id", sess.id).eq("is_pinned", true).order("updated_at"),
    ]);
    setNotes(((noteRows as DmNote[]) ?? []).map(asNote));
    setLists(((listRows as DmChecklist[]) ?? []).map(asChecklist));
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeTable("dm_notes", sessionId ? `session_id=eq.${sessionId}` : "session_id=eq.none", () => {
    void load();
  });
  useRealtimeTable("dm_checklists", sessionId ? `session_id=eq.${sessionId}` : "session_id=eq.none", () => {
    void load();
  });

  async function unpinNote(id: string) {
    await supabase.from("dm_notes").update({ is_reminder: false, updated_at: new Date().toISOString() }).eq("id", id);
    setNotes((current) => current.filter((note) => note.id !== id));
  }

  async function unpinList(id: string) {
    await supabase.from("dm_checklists").update({ is_pinned: false, updated_at: new Date().toISOString() }).eq("id", id);
    setLists((current) => current.filter((list) => list.id !== id));
  }

  async function toggleItem(list: DmChecklist, itemId: string) {
    const items = list.items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item));
    setLists((current) => current.map((row) => (row.id === list.id ? { ...row, items } : row)));
    await supabase
      .from("dm_checklists")
      .update({ items, updated_at: new Date().toISOString() })
      .eq("id", list.id);
  }

  return (
    <>
      {notes.map((note, index) => (
        <MasterFloatWindow
          key={note.id}
          id={`note-${note.id}`}
          title={note.title}
          accent="var(--gold-400)"
          icon={<StickyNote size={13} />}
          defaultPos={{ x: 96 + index * 28, y: 92 + index * 32 }}
          onUnpin={() => void unpinNote(note.id)}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-2)]">
            {note.body.trim() || "Sin cuerpo. El Master lo recordará igual."}
          </p>
        </MasterFloatWindow>
      ))}
      {lists.map((list, index) => {
        const progress = checklistProgress(list.items);
        return (
          <MasterFloatWindow
            key={list.id}
            id={`list-${list.id}`}
            title={list.title}
            accent="var(--cyan-400)"
            icon={<ListChecks size={13} />}
            defaultPos={{
              x: typeof window === "undefined" ? 720 : Math.max(80, window.innerWidth - 360 - index * 28),
              y: 92 + index * 32,
            }}
            onUnpin={() => void unpinList(list.id)}
          >
            <ChecklistProgress done={progress.done} total={progress.total} className="mb-3" />
            <ul className="space-y-1.5">
              {list.items.length === 0 && (
                <li className="text-xs text-[var(--text-3)]">Lista vacía. El dungeon no espera a nadie.</li>
              )}
              {list.items.map((item) => (
                <ChecklistRow key={item.id} item={item} onToggle={() => void toggleItem(list, item.id)} />
              ))}
            </ul>
          </MasterFloatWindow>
        );
      })}
    </>
  );
}

function ChecklistRow({ item, onToggle }: { item: DmChecklistItem; onToggle: () => void }) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 rounded-[10px] px-1 py-1 hover:bg-[rgba(255,255,255,0.04)]">
        <input
          type="checkbox"
          checked={item.done}
          onChange={onToggle}
          className="mt-0.5 accent-[var(--cyan-400)]"
        />
        <span className={cn("text-sm text-[var(--text-1)]", item.done && "text-[var(--text-4)] line-through")}>
          {item.text}
        </span>
      </label>
    </li>
  );
}
