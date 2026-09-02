"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import type { Crawler, CombatRound, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { COMBAT_PHASES } from "@/lib/rules";
import { PHASE_LABEL } from "@/lib/copy";

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
      name: "Caja misteriosa",
      rarity: "legendary",
      system_copy: "The System se siente generoso. Probablemente.",
      payload: { contents: [] },
    }).select().single();
    if (boxRes) {
      await supabase.from("loot_boxes").insert({
        session_id: session.id,
        resource_id: boxRes.id,
        contents: [{ name: "Botín aleatorio", rarity: "rare" }],
      });
    }
    load();
  }

  return (
    <div className="space-y-6">
      <GlassPanel title="Mundo / Piso" subtitle="FN afecta a todos los cálculos de DC">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Número de piso (FN)"
            value={String(floorNumber)}
            onChange={(e) => setFloorNumber(+e.target.value)}
            options={Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: `Piso ${i + 1}` }))}
          />
          <Button variant="session" onClick={updateFloor}>Fijar piso</Button>
        </div>
      </GlassPanel>

      <GlassPanel title="Combate — 5 fases">
        {!combat ? (
          <Button variant="energy" onClick={startCombat}>Iniciar ronda de combate</Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-cyan)]">
              Ronda {combat.round_number} · {PHASE_LABEL[combat.phase as keyof typeof PHASE_LABEL] ?? combat.phase}
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

      <GlassPanel title="Descansos">
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
          <Button variant="neon" size="sm" onClick={() => applyRest("short")}>Descanso corto (2h)</Button>
          <Button variant="neon" size="sm" onClick={() => applyRest("long")}>Descanso largo (8h)</Button>
          <Button variant="session" size="sm" onClick={() => applyRest("full_day")}>Día completo (30h)</Button>
        </div>
      </GlassPanel>

      <GlassPanel title="Cajas de loot">
        <Button variant="energy" onClick={createLootBox}>Crear caja de loot</Button>
      </GlassPanel>

      <GlassPanel title="Chinchetas del mapa" subtitle="Se gestionan en Mesa">
        <p className="text-sm text-[var(--text-3)]">Usa la pantalla Mesa para colocar chinchetas en los mapas.</p>
      </GlassPanel>
    </div>
  );
}
