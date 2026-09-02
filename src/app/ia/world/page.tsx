"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import type { Crawler, CombatRound, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { COMBAT_PHASES } from "@/lib/rules";

export default function IAWorldPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [combat, setCombat] = useState<CombatRound | null>(null);
  const [floorNumber, setFloorNumber] = useState(1);
  const [selectedCrawlers, setSelectedCrawlers] = useState<string[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from("session_members").select("sessions(*)").eq("user_id", user.id).limit(1).maybeSingle();
    const sess = castSession(member?.sessions);
    setSession(sess ?? null);
    setFloorNumber(sess?.floor_number ?? 1);
    if (sess) {
      const [{ data: cr }, { data: cb }] = await Promise.all([
        supabase.from("crawlers").select("*").eq("session_id", sess.id),
        supabase.from("combat_rounds").select("*").eq("session_id", sess.id).eq("is_active", true).maybeSingle(),
      ]);
      setCrawlers((cr as Crawler[]) ?? []);
      setCombat(cb as CombatRound | null);
    }
  }

  async function updateFloor() {
    if (!session) return;
    await supabase.from("sessions").update({ floor_number: floorNumber }).eq("id", session.id);
    load();
  }

  async function startCombat() {
    if (!session) return;
    await supabase.from("combat_rounds").insert({
      session_id: session.id,
      phase: "combat_1",
      round_number: 1,
    });
    await supabase.from("sessions").update({ phase: "combat_1" }).eq("id", session.id);
    load();
  }

  async function advancePhase(phase: string) {
    if (!session || !combat) return;
    await supabase.from("combat_rounds").update({ phase }).eq("id", combat.id);
    await supabase.from("sessions").update({ phase }).eq("id", session.id);
    load();
  }

  async function applyRest(type: "short" | "long" | "full_day") {
    if (!session) return;
    const ids = selectedCrawlers.length ? selectedCrawlers : crawlers.map((c) => c.id);
    await supabase.rpc("apply_rest", {
      p_session_id: session.id,
      p_rest_type: type,
      p_crawler_ids: ids,
    });
    load();
  }

  async function createLootBox() {
    if (!session) return;
    const { data: boxRes } = await supabase.from("resources").insert({
      session_id: session.id,
      kind: "box",
      name: "Mystery Box",
      rarity: "legendary",
      system_copy: "The System is feeling generous. Probably.",
      payload: { contents: [] },
    }).select().single();
    if (boxRes) {
      await supabase.from("loot_boxes").insert({
        session_id: session.id,
        resource_id: boxRes.id,
        contents: [{ name: "Random Loot", rarity: "rare" }],
      });
    }
    load();
  }

  return (
    <div className="space-y-6">
      <GlassPanel title="World / Floor" subtitle={`FN affects all DC calculations`}>
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Floor Number (FN)"
            value={String(floorNumber)}
            onChange={(e) => setFloorNumber(+e.target.value)}
            options={Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: `Floor ${i + 1}` }))}
          />
          <Button variant="session" onClick={updateFloor}>Set Floor</Button>
        </div>
      </GlassPanel>

      <GlassPanel title="Combat — 5 Phases">
        {!combat ? (
          <Button variant="energy" onClick={startCombat}>Start Combat Round</Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-cyan)]">
              Round {combat.round_number} · {combat.phase}
            </p>
            <div className="flex flex-wrap gap-2">
              {COMBAT_PHASES.map((p) => (
                <Button key={p.key} variant="neon" size="sm" onClick={() => advancePhase(p.key)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </GlassPanel>

      <GlassPanel title="Rests">
        <div className="mb-4 flex flex-wrap gap-2">
          {crawlers.map((c) => (
            <label key={c.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selectedCrawlers.includes(c.id)}
                onChange={(e) =>
                  setSelectedCrawlers(
                    e.target.checked
                      ? [...selectedCrawlers, c.id]
                      : selectedCrawlers.filter((id) => id !== c.id)
                  )
                }
              />
              {c.name}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="neon" size="sm" onClick={() => applyRest("short")}>Short Rest (2h)</Button>
          <Button variant="neon" size="sm" onClick={() => applyRest("long")}>Long Rest (8h)</Button>
          <Button variant="session" size="sm" onClick={() => applyRest("full_day")}>Full Day (30h)</Button>
        </div>
      </GlassPanel>

      <GlassPanel title="Loot Boxes">
        <Button variant="energy" onClick={createLootBox}>Create Loot Box</Button>
      </GlassPanel>

      <GlassPanel title="Map pins" subtitle="Manage on Mesa">
        <p className="text-sm text-[var(--text-3)]">Use the Mesa screen to place pins on maps.</p>
      </GlassPanel>
    </div>
  );
}
