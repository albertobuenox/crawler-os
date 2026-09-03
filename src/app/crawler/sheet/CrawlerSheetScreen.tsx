"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CharacterSheet } from "@/components/hud/CharacterSheet";
import type { Crawler, Skill, Effect, ItemInstance, Resource } from "@/lib/types";

type SheetItem = ItemInstance & { resource: Resource };

export function CrawlerSheetScreen({ crawlerId }: { crawlerId?: string }) {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [items, setItems] = useState<SheetItem[]>([]);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let target: Crawler | null = null;
    if (crawlerId) {
      const { data: member } = await supabase
        .from("session_members")
        .select("session_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!member) {
        setMissing(true);
        return;
      }
      const { data: c } = await supabase
        .from("crawlers")
        .select("*")
        .eq("id", crawlerId)
        .eq("session_id", member.session_id)
        .maybeSingle();
      target = (c as Crawler) ?? null;
    } else {
      const { data: c } = await supabase.from("crawlers").select("*").eq("owner_user_id", user.id).maybeSingle();
      target = (c as Crawler) ?? null;
    }

    if (!target) {
      setMissing(true);
      setCrawler(null);
      return;
    }

    setMissing(false);
    setCrawler(target);
    const [{ data: sk }, { data: ef }, { data: it }] = await Promise.all([
      supabase.from("skills").select("*, skill_catalog(*)").eq("crawler_id", target.id),
      supabase.from("effects").select("*").eq("crawler_id", target.id),
      supabase.from("item_instances").select("*, resource:resources(*)").eq("crawler_id", target.id),
    ]);
    setSkills((sk as Skill[]) ?? []);
    setEffects((ef as Effect[]) ?? []);
    setItems((it as SheetItem[]) ?? []);
  }, [crawlerId, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <p className="p-4 text-[var(--text-3)]">Sin hoja de personaje.</p>;
  if (!crawler) return <p className="p-4 text-[var(--text-3)]">Cargando hoja...</p>;

  return (
    <main className="p-3 pb-24 lg:p-4">
      <CharacterSheet crawler={crawler} skills={skills} effects={effects} items={items} />
    </main>
  );
}
