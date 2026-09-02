"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Select, Input } from "@/components/ui/Input";
import { DiceOverlay } from "@/components/hud/DiceOverlay";
import type { Crawler, DiceRequest, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { computeDc } from "@/lib/rules";
import type { DiceRollKind } from "@/lib/types";
import { useSessionBroadcast } from "@/hooks/useSession";

export default function IADicePage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [requests, setRequests] = useState<DiceRequest[]>([]);
  const [crawlerId, setCrawlerId] = useState("");
  const [label, setLabel] = useState("Stat check");
  const [rollKind, setRollKind] = useState<DiceRollKind>("stat_check");
  const [advantage, setAdvantage] = useState(false);
  const [mobAdvantage, setMobAdvantage] = useState(false);

  const { broadcast } = useSessionBroadcast(session?.id, () => {});

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from("session_members").select("sessions(*)").eq("user_id", user.id).limit(1).maybeSingle();
    const sess = castSession(member?.sessions);
    setSession(sess ?? null);
    if (sess) {
      const [{ data: cr }, { data: dr }] = await Promise.all([
        supabase.from("crawlers").select("*").eq("session_id", sess.id),
        supabase.from("dice_requests").select("*").eq("session_id", sess.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setCrawlers((cr as Crawler[]) ?? []);
      setRequests((dr as DiceRequest[]) ?? []);
    }
  }

  async function requestRoll() {
    if (!session) return;
    const dc = computeDc(rollKind, session.floor_number);
    const { data } = await supabase.from("dice_requests").insert({
      session_id: session.id,
      crawler_id: crawlerId || null,
      requested_by: (await supabase.auth.getUser()).data.user?.id,
      roll_kind: rollKind,
      label,
      dc,
      advantage,
      mob_advantage: mobAdvantage,
    }).select().single();
    await broadcast("dice_anim", { requestId: data?.id, label, dc });
    load();
  }

  return (
    <div className="space-y-6">
      <GlassPanel title="Request Roll" subtitle="La IA decides who rolls">
        <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <Select
            label="Crawler"
            value={crawlerId}
            onChange={(e) => setCrawlerId(e.target.value)}
            options={[{ value: "", label: "Any / IA rolls" }, ...crawlers.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Select
            label="Roll type"
            value={rollKind}
            onChange={(e) => setRollKind(e.target.value as DiceRollKind)}
            options={[
              { value: "stat_check", label: "Stat check (10+FN)" },
              { value: "opposed", label: "Opposed (10+mod+FN)" },
              { value: "unopposed", label: "Unopposed (10+FN×2)" },
              { value: "attack", label: "Attack" },
            ]}
          />
          <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          {session && (
            <p className="self-end text-sm text-[var(--text-cyan)]">
              DC preview: {computeDc(rollKind, session.floor_number)}
            </p>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={advantage} onChange={(e) => setAdvantage(e.target.checked)} />
            Advantage
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={mobAdvantage} onChange={(e) => setMobAdvantage(e.target.checked)} />
            Mob advantage (+5 DC)
          </label>
          <Button variant="energy" onClick={requestRoll}>Request Roll</Button>
        </div>
      </GlassPanel>

      <GlassPanel title="Recent requests">
        <ul className="space-y-2 font-mono-system text-xs">
          {requests.map((r) => (
            <li key={r.id} className="well px-3 py-2">
              {r.label} — DC {r.dc} — <span className="capitalize">{r.status}</span>
            </li>
          ))}
        </ul>
      </GlassPanel>
    </div>
  );
}
