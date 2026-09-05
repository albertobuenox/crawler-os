"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminInRoomOverlay } from "@/components/hud/AdminInRoomOverlay";
import { PartyAvatarRail, toPartyAvatar, type PartyAvatar } from "@/components/hud/PartyAvatarRail";
import { SceneStage } from "@/components/hud/SceneStage";
import { SceneHotbar } from "@/components/hud/SceneHotbar";
import { useAdminInRoom } from "@/hooks/useAdminInRoom";
import { useSceneCanvas } from "@/hooks/useSceneCanvas";
import { useRealtimeTable, useSessionBroadcast } from "@/hooks/useSession";
import { sortSkillsStable } from "@/lib/skills";
import type { ItemInstance, Resource, Skill } from "@/lib/types";

type SheetItem = ItemInstance & { resource: Resource };

function applyPartyPatch(prev: PartyAvatar[], patch: Partial<PartyAvatar> & { id: string }): PartyAvatar[] {
  const current = prev.find((m) => m.id === patch.id);
  const merged = toPartyAvatar({
    id: patch.id,
    name: patch.name ?? current?.name ?? "",
    portrait_url: patch.portrait_url !== undefined ? patch.portrait_url : current?.portrait_url ?? null,
    status: patch.status ?? current?.status ?? "exploring",
    level: patch.level ?? current?.level ?? 1,
    race: patch.race !== undefined ? patch.race : current?.race ?? null,
    class_name: patch.class_name !== undefined ? patch.class_name : current?.class_name ?? null,
    hp_boxes_filled: patch.hp_boxes_filled ?? current?.hp_boxes_filled ?? 0,
    mana_current: patch.mana_current ?? current?.mana_current ?? 0,
    mana_max: patch.mana_max ?? current?.mana_max ?? 0,
    avatar_emotion: patch.avatar_emotion !== undefined ? patch.avatar_emotion : current?.avatar_emotion ?? null,
  });
  if (current) return prev.map((m) => (m.id === patch.id ? merged : m));
  if (!merged.name) return prev;
  return [...prev, merged].sort((a, b) => a.name.localeCompare(b.name));
}

export function SceneSpectator({
  sessionId,
  crawlerId,
  crawlerName,
  onOpenSheet,
}: {
  sessionId: string;
  crawlerId: string;
  crawlerName?: string;
  onOpenSheet?: (id: string) => void;
}) {
  const supabase = createClient();
  const { doc, commit, setBusy } = useSceneCanvas(sessionId, { role: "dm" });
  const admin = useAdminInRoom(sessionId);
  const [party, setParty] = useState<PartyAvatar[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [items, setItems] = useState<SheetItem[]>([]);

  const loadParty = useCallback(async () => {
    const { data: crawlers } = await supabase
      .from("crawlers")
      .select("id, name, portrait_url, status, level, race, class_name, hp_boxes_filled, mana_current, mana_max, avatar_emotion")
      .eq("session_id", sessionId)
      .order("name");
    setParty(((crawlers as PartyAvatar[]) ?? []).map((c) => toPartyAvatar(c)));
  }, [sessionId, supabase]);

  const loadKit = useCallback(async () => {
    const [{ data: sk }, { data: it }] = await Promise.all([
      supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", crawlerId).order("created_at"),
      supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", crawlerId),
    ]);
    setSkills(sortSkillsStable((sk as Skill[]) ?? []));
    setItems((it as SheetItem[]) ?? []);
  }, [crawlerId, supabase]);

  useEffect(() => {
    void loadParty();
  }, [loadParty]);

  useEffect(() => {
    void loadKit();
  }, [loadKit]);

  useSessionBroadcast(
    sessionId,
    useCallback((event, payload) => {
      if (event === "party_patch" && payload && typeof payload === "object" && "id" in payload) {
        setParty((prev) => applyPartyPatch(prev, payload as Partial<PartyAvatar> & { id: string }));
      }
    }, [])
  );

  useRealtimeTable<PartyAvatar & { session_id?: string }>(
    "crawlers",
    `session_id=eq.${sessionId}`,
    ({ eventType, new: row, old }) => {
      if (eventType === "DELETE") {
        const id = (old as { id?: string }).id;
        if (id) setParty((prev) => prev.filter((m) => m.id !== id));
        return;
      }
      if (row?.id) setParty((prev) => applyPartyPatch(prev, row));
    }
  );

  const focus = useMemo(() => party.find((m) => m.id === crawlerId), [crawlerId, party]);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 gap-2 p-1">
        <PartyAvatarRail
          members={party}
          selfId={crawlerId}
          locked={admin.active}
          forceEmotion={admin.active ? "miedo" : undefined}
          onOpenSheet={admin.active ? undefined : onOpenSheet}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-2">
          <p className="text-center font-display text-xs tracking-widest text-[var(--cyan-400)]">
            ESCENA · {focus?.name ?? crawlerName ?? "CRAWLER"}
          </p>
          {doc && (
            <SceneStage
              doc={doc}
              mode="play"
              role="dm"
              selfId={crawlerId}
              className="min-h-0 w-full flex-1"
              onCommit={(next, immediate) => commit(next, immediate)}
              onBusy={setBusy}
            />
          )}
        </div>
      </div>
      <SceneHotbar crawlerId={crawlerId} skills={skills} items={items} readOnly />
      <AdminInRoomOverlay active={admin.active} className="absolute inset-0" />
    </div>
  );
}
