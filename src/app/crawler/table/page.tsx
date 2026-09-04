"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { TableCanvas } from "@/components/hud/TableCanvas";
import { PartyAvatarRail, type PartyAvatar } from "@/components/hud/PartyAvatarRail";
import { SceneChat } from "@/components/hud/SceneChat";
import { SceneHotbar } from "@/components/hud/SceneHotbar";
import type { ItemInstance, Resource, Skill, TableState, MapPin } from "@/lib/types";
import { useSessionBroadcast } from "@/hooks/useSession";
import { updateCrawlerVitals } from "@/lib/crawler-vitals";
import { lifeToBoxesFilled } from "@/lib/rules";
import { sortSkillsStable } from "@/lib/skills";

type SheetItem = ItemInstance & { resource: Resource };

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
        .select("id, name, portrait_url, status, level, owner_user_id, hp_boxes_filled, mana_current, mana_max")
        .eq("session_id", member.session_id)
        .order("name"),
    ]);
    setTableState(ts as TableState);
    setPins((p as MapPin[]) ?? []);
    const roster = (crawlers as (PartyAvatar & { owner_user_id: string | null })[]) ?? [];
    const mine =
      roster.find((c) => c.owner_user_id === user.id) ??
      roster.find((c) => c.id === member.crawler_id);
    setSelfId(mine?.id ?? null);
    setParty(
      roster.map((c) => ({
        id: c.id,
        name: c.name,
        portrait_url: c.portrait_url,
        status: c.status,
        level: c.level,
        hp_boxes_filled: c.hp_boxes_filled,
        mana_current: c.mana_current,
        mana_max: c.mana_max,
      }))
    );
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
      .on("postgres_changes", { event: "*", schema: "public", table: "crawlers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "skills" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "item_instances" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load, supabase]);

  useSessionBroadcast(sessionId, useCallback((event) => {
    if (event === "table_update") load();
  }, [load]));

  return (
    <main className="relative h-full min-h-0 overflow-hidden bg-[var(--void-950)]">
      <div className="flex h-full min-h-0 gap-2 overflow-visible p-2 pb-16">
        <PartyAvatarRail
          members={party}
          selfId={selfId}
          onSelfLifeChange={
            selfId
              ? (life) => {
                  const hp_boxes_filled = lifeToBoxesFilled(life);
                  setParty((prev) =>
                    prev.map((m) => (m.id === selfId ? { ...m, hp_boxes_filled } : m))
                  );
                  void updateCrawlerVitals(selfId, { hp_boxes_filled });
                }
              : undefined
          }
          onSelfManaChange={
            selfId
              ? (mana_current) => {
                  setParty((prev) =>
                    prev.map((m) => (m.id === selfId ? { ...m, mana_current } : m))
                  );
                  void updateCrawlerVitals(selfId, { mana_current });
                }
              : undefined
          }
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          <p className="text-center font-display text-xs tracking-widest text-[var(--cyan-400)]">ESCENA</p>
          <TableCanvas tableState={tableState} resource={resource} pins={pins} className="min-h-0 flex-1" />
        </div>
      </div>
      {selfId && <SceneHotbar crawlerId={selfId} skills={skills} items={items} />}
      <SceneChat />
    </main>
  );
}
