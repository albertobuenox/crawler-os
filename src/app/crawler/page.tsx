"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { CrawlerStatusStrip } from "@/components/layout/Nav";
import { EventLogList } from "@/components/hud/EventLog";
import { CinematicOverlay } from "@/components/hud/CinematicOverlay";
import { DiceOverlay } from "@/components/hud/DiceOverlay";
import type { Crawler, EventLogEntry, Notification, DiceRequest } from "@/lib/types";
import { useSessionBroadcast } from "@/hooks/useSession";
import { statModifier } from "@/lib/rules";
import type { Rarity } from "@/lib/types";

export default function CrawlerHomePage() {
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cinematic, setCinematic] = useState<{ open: boolean; type: "reward" | "penalty" | "loot_box"; title: string; body?: string; itemName?: string; rarity?: Rarity }>({ open: false, type: "reward", title: "" });
  const [diceRequest, setDiceRequest] = useState<DiceRequest | null>(null);
  const [diceResult, setDiceResult] = useState<{ total: number; raw: number[]; success?: boolean | null } | null>(null);
  const [rolling, setRolling] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from("session_members").select("session_id, crawler_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!member) return;

    let crawlerId = member.crawler_id;
    if (!crawlerId) {
      const { data: c } = await supabase.from("crawlers").select("id").eq("session_id", member.session_id).eq("owner_user_id", user.id).maybeSingle();
      crawlerId = c?.id;
    }

    if (crawlerId) {
      const [{ data: cr }, { data: ev }, { data: notif }] = await Promise.all([
        supabase.from("crawlers").select("*").eq("id", crawlerId).single(),
        supabase.from("event_log").select("*").eq("session_id", member.session_id).or(`target_crawler_id.eq.${crawlerId},target_crawler_id.is.null`).order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("*").eq("user_id", user.id).eq("is_read", false).limit(5),
      ]);
      setCrawler(cr as Crawler);
      setEvents((ev as EventLogEntry[]) ?? []);
      setNotifications((notif as Notification[]) ?? []);

      const unread = (notif as Notification[])?.[0];
      if (unread && !unread.cinematic_shown) {
        setCinematic({
          open: true,
          type: unread.notification_type === "penalty" ? "penalty" : unread.notification_type === "loot_box" ? "loot_box" : "reward",
          title: unread.title,
          body: unread.body ?? undefined,
          itemName: (unread.payload as { resource_name?: string })?.resource_name,
          rarity: (unread.payload as { rarity?: Rarity })?.rarity,
        });
        await supabase.from("notifications").update({ cinematic_shown: true }).eq("id", unread.id);
      }
    }

    const { data: pendingDice } = await supabase
      .from("dice_requests")
      .select("*")
      .eq("session_id", member.session_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingDice && (!pendingDice.crawler_id || pendingDice.crawler_id === crawlerId)) {
      setDiceRequest(pendingDice as DiceRequest);
    }
  }, [supabase]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("crawler-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "crawlers" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, supabase]);

  useSessionBroadcast(crawler?.session_id, useCallback((event, payload) => {
    if (event === "cinematic") {
      const p = payload as Partial<typeof cinematic>;
      setCinematic({
        open: true,
        type: p.type ?? "reward",
        title: p.title ?? "REWARD",
        body: p.body,
        itemName: p.itemName,
        rarity: p.rarity,
      });
    }
    if (event === "dice_anim") load();
  }, [load]));

  async function rollDice() {
    if (!diceRequest || !crawler) return;
    setRolling(true);
    const mod = statModifier(crawler.dex_enhanced);
    const { data } = await supabase.rpc("submit_dice_roll", {
      p_request_id: diceRequest.id,
      p_modifier: mod,
    });
    setDiceResult(data as { total: number; raw: number[]; success?: boolean | null });
    setRolling(false);
    setDiceRequest(null);
    load();
  }

  if (!crawler) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <GlassPanel title="No crawler assigned">
          <p className="mb-4 text-sm">Join a session with a floor code.</p>
          <Link href="/join"><Button variant="energy">Enter Floor Code</Button></Link>
        </GlassPanel>
      </main>
    );
  }

  return (
    <>
      <CrawlerStatusStrip
        name={crawler.name}
        level={crawler.level}
        hpBoxes={crawler.hp_boxes_filled}
        conEnhanced={crawler.con_enhanced}
        mana={crawler.mana_current}
        manaMax={crawler.mana_max}
      />
      <main className="space-y-4 p-4">
        {crawler.status === "downed" && (
          <div className="rounded-xl border border-[var(--stroke-danger)] bg-[var(--glass-danger)] p-3 text-center font-display text-sm text-[var(--danger)]">
            YOU ARE DOWN — {crawler.unconscious_rounds_remaining} rounds remaining
          </div>
        )}
        {crawler.status === "dead" && (
          <div className="rounded-xl border border-[var(--stroke-danger)] p-3 text-center font-display text-[var(--danger)] opacity-70">
            YOU ARE DEAD
          </div>
        )}

        <GlassPanel title="Current objective" subtitle={`Floor ${crawler.floor}`}>
          <p className="text-sm text-[var(--text-2)]">Survive. The System is watching.</p>
        </GlassPanel>

        <GlassPanel title="Recent System messages">
          {notifications.length === 0 ? (
            <p className="text-sm text-[var(--text-3)]">All quiet. Suspiciously quiet.</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="mb-2 well p-2 text-sm">
                <span className="font-display text-xs text-[var(--orange-400)]">{n.title}</span>
                <p>{n.body}</p>
              </div>
            ))
          )}
        </GlassPanel>

        <GlassPanel title="Your log">
          <EventLogList entries={events} compact />
        </GlassPanel>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/crawler/inventory"><Button variant="neon" className="w-full">Inventory</Button></Link>
          <Link href="/crawler/table"><Button variant="neon" className="w-full">Mesa</Button></Link>
        </div>
      </main>

      <CinematicOverlay
        open={cinematic.open}
        type={cinematic.type}
        title={cinematic.title}
        body={cinematic.body}
        itemName={cinematic.itemName}
        rarity={cinematic.rarity}
        onClose={() => setCinematic({ ...cinematic, open: false })}
      />

      <DiceOverlay
        open={!!diceRequest}
        label={diceRequest?.label ?? ""}
        dc={diceRequest?.dc}
        onRoll={rollDice}
        onClose={() => { setDiceRequest(null); setDiceResult(null); }}
        result={diceResult}
        rolling={rolling}
      />
    </>
  );
}
