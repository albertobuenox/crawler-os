"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import type { Crawler, Resource } from "@/lib/types";
import { useSessionBroadcast } from "@/hooks/useSession";

export default function GrantPage() {
  const { id: crawlerId } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const [crawler, setCrawler] = useState<Crawler | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceId, setResourceId] = useState("");
  const [mode, setMode] = useState("reward");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const { broadcast } = useSessionBroadcast(crawler?.session_id, () => {});

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("crawlers").select("*").eq("id", crawlerId).single();
      setCrawler(c as Crawler);
      if (c) {
        const { data: r } = await supabase.from("resources").select("*").eq("session_id", c.session_id);
        setResources((r as Resource[]) ?? []);
      }
    })();
  }, [crawlerId, supabase]);

  async function grant() {
    if (!resourceId || !crawler) return;
    setLoading(true);
    const { error } = await supabase.rpc("grant_resource", {
      p_resource_id: resourceId,
      p_crawler_ids: [crawlerId],
      p_mode: mode,
      p_system_message: message || null,
    });
    if (!error) {
      const res = resources.find((r) => r.id === resourceId);
      await broadcast("cinematic", {
        type: mode === "penalty" ? "penalty" : "reward",
        title: mode === "penalty" ? "PENALTY" : "REWARD",
        itemName: res?.name,
        rarity: res?.rarity,
        body: message,
      });
      router.push("/ia/crawlers");
    }
    setLoading(false);
  }

  const selected = resources.find((r) => r.id === resourceId);

  return (
    <GlassPanel title="Assign Resource" subtitle={crawler?.name}>
      <div className="space-y-4 max-w-lg">
        <Select
          label="Resource"
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          options={[
            { value: "", label: "Select..." },
            ...resources.map((r) => ({ value: r.id, label: `${r.name} (${r.kind})` })),
          ]}
        />
        <Select
          label="Delivery mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={[
            { value: "reward", label: "Reward cinematic" },
            { value: "penalty", label: "Penalty cinematic" },
            { value: "silent", label: "Silent (log only)" },
          ]}
        />
        <Textarea
          label="System message"
          placeholder="The System has decided you deserve a treat. Probably by accident."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {selected && (
          <div className="well p-3 text-sm">
            <p className="font-semibold text-[var(--text-1)]">{selected.name}</p>
            <p className="capitalize text-[var(--text-cyan)]">{selected.rarity}</p>
          </div>
        )}
        <Button variant={mode === "penalty" ? "danger" : "energy"} loading={loading} onClick={grant}>
          Confirm
        </Button>
      </div>
    </GlassPanel>
  );
}
