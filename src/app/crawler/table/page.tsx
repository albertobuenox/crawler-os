"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { TableCanvas } from "@/components/hud/TableCanvas";
import { PartyAvatarRail, toPartyAvatar, type PartyAvatar } from "@/components/hud/PartyAvatarRail";
import { SceneChat } from "@/components/hud/SceneChat";
import { useSceneDiceApi } from "@/components/hud/SceneDiceProvider";
import { SceneHotbar } from "@/components/hud/SceneHotbar";
import { MinimapPanel } from "@/components/hud/MinimapPanel";
import type { ItemInstance, Resource, Skill, TableState, MapPin } from "@/lib/types";
import { useRealtimeTable, useSessionBroadcast } from "@/hooks/useSession";
import { updateCrawlerVitals } from "@/lib/crawler-vitals";
import { readStoredAvatarEmotions, type AvatarEmotion } from "@/lib/crawler-art";
import { lifeToBoxesFilled } from "@/lib/rules";
import { sortSkillsStable } from "@/lib/skills";

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

export default function CrawlerTablePage() {
  const supabase = createClient();
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [resource, setResource] = useState<Resource | null>(null);
  const [sessionId, setSessionId] = useState<string>();
  const [party, setParty] = useState<PartyAvatar[]>([]);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [items, setItems] = useState<SheetItem[]>([]);
  const chatMembers = useMemo(
    () => party.map((m) => ({ id: m.id, label: m.name })),
    [party]
  );

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from("session_members").select("session_id, crawler_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!member) return;
    setSessionId(member.session_id);
    const [{ data: ts }, { data: p }, { data: crawlers }] = await Promise.all([
      supabase.from("table_state").select("*").eq("session_id", member.session_id).maybeSingle(),
      supabase.from("map_pins").select("*").eq("session_id", member.session_id),
      supabase
        .from("crawlers")
        .select("id, name, portrait_url, status, level, race, class_name, owner_user_id, hp_boxes_filled, mana_current, mana_max, avatar_emotion")
        .eq("session_id", member.session_id)
        .order("name"),
    ]);
    setTableState(ts as TableState);
    setPins((p as MapPin[]) ?? []);
    const roster = (crawlers as (PartyAvatar & { owner_user_id: string | null; avatar_emotion?: string | null })[]) ?? [];
    const mine =
      roster.find((c) => c.owner_user_id === user.id) ??
      roster.find((c) => c.id === member.crawler_id);
    setSelfId(mine?.id ?? null);
    const mapped = roster.map((c) => toPartyAvatar(c));
    setParty(mapped);

    const stored = readStoredAvatarEmotions();
    if (mine && stored[mine.id]) {
      setParty((prev) => applyPartyPatch(prev, { id: mine.id, avatar_emotion: stored[mine.id] }));
    }

    if (ts?.resource_id) {
      const { data: r } = await supabase.from("resources").select("*").eq("id", ts.resource_id).single();
      setResource(r as Resource);
    } else {
      setResource(null);
    }
    if (mine) {
      const [{ data: sk }, { data: it }] = await Promise.all([
        supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", mine.id).order("created_at"),
        supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", mine.id),
      ]);
      setSkills(sortSkillsStable((sk as Skill[]) ?? []));
      setItems((it as SheetItem[]) ?? []);
    } else {
      setSkills([]);
      setItems([]);
    }
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("crawler-table")
      .on("postgres_changes", { event: "*", schema: "public", table: "table_state" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "map_pins" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "item_instances" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, supabase]);

  const { broadcast } = useSessionBroadcast(sessionId, useCallback((event, payload) => {
    if (event === "table_update") load();
    if (event === "party_patch" && payload && typeof payload === "object" && "id" in payload) {
      setParty((prev) => applyPartyPatch(prev, payload as Partial<PartyAvatar> & { id: string }));
    }
  }, [load]));
  const dice = useSceneDiceApi();
  const choosing = dice.state?.mode === "choosing" ? dice.state : null;

  useRealtimeTable<PartyAvatar & { session_id?: string }>(
    "crawlers",
    sessionId ? `session_id=eq.${sessionId}` : "session_id=eq.none",
    ({ eventType, new: row, old }) => {
      if (eventType === "DELETE") {
        const id = (old as { id?: string }).id;
        if (id) setParty((prev) => prev.filter((m) => m.id !== id));
        return;
      }
      if (row?.id) {
        setParty((prev) => applyPartyPatch(prev, row));
      }
    }
  );

  function patchSelf(patch: Partial<PartyAvatar>) {
    if (!selfId) return;
    const next = { id: selfId, ...patch };
    setParty((prev) => applyPartyPatch(prev, next));
    void broadcast("party_patch", next);
  }

  return (
    <main className="relative h-full min-h-0 overflow-hidden bg-[var(--void-950)]">
      <div className="flex h-full min-h-0 gap-2 overflow-visible p-2 pb-16">
        <PartyAvatarRail
          members={party}
          selfId={selfId}
          choosingId={choosing?.crawlerId}
          onSelfLifeChange={
            selfId
              ? (life) => {
                  const hp_boxes_filled = lifeToBoxesFilled(life);
                  patchSelf({ hp_boxes_filled });
                  void updateCrawlerVitals(selfId, { hp_boxes_filled });
                }
              : undefined
          }
          onSelfManaChange={
            selfId
              ? (mana_current) => {
                  patchSelf({ mana_current });
                  void updateCrawlerVitals(selfId, { mana_current });
                }
              : undefined
          }
          onSelfEmotionChange={
            selfId
              ? (emotion: AvatarEmotion | null) => {
                  patchSelf({ avatar_emotion: emotion });
                  void updateCrawlerVitals(selfId, { avatar_emotion: emotion });
                }
              : undefined
          }
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center gap-2">
          <p className="text-center font-display text-xs tracking-widest text-[var(--cyan-400)]">ESCENA</p>
          <TableCanvas tableState={tableState} resource={resource} pins={pins} className="min-h-0 w-full flex-1" />
        </div>
        <div className="w-20 shrink-0 sm:w-24 lg:w-28" aria-hidden="true" />
      </div>
      <AnimatePresence>
        {choosing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-[46] bg-[rgba(5,6,13,0.72)] backdrop-blur-[6px]"
          />
        )}
      </AnimatePresence>
      {selfId && (
        <SceneHotbar
          crawlerId={selfId}
          skills={skills}
          items={items}
          lifted={choosing?.crawlerId === selfId}
          diceLocked={!!dice.state && dice.state.crawlerId !== selfId}
          onDiceOpenChange={dice.announceChoosing}
          onDiePicked={dice.pickDie}
        />
      )}
      <SceneChat sessionId={sessionId} members={chatMembers} />
      <MinimapPanel sessionId={sessionId} selfId={selfId} />
    </main>
  );
}
