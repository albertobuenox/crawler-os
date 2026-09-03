"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import type { Crawler, Resource } from "@/lib/types";
import { KIND_LABEL, RARITY_LABEL, BRAND } from "@/lib/copy";
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
      router.push("/dm/crawlers");
    }
    setLoading(false);
  }

  const selected = resources.find((r) => r.id === resourceId);

  return (
    <GlassPanel title="Asignar recurso" subtitle={crawler?.name}>
      <div className="space-y-4 max-w-lg">
        <Select
          label="Recurso"
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          options={[
            { value: "", label: "Seleccionar..." },
            ...resources.map((r) => ({ value: r.id, label: `${r.name} (${KIND_LABEL[r.kind]})` })),
          ]}
        />
        <Select
          label="Modo de entrega"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={[
            { value: "reward", label: "Cinemática de recompensa" },
            { value: "penalty", label: "Cinemática de penalización" },
            { value: "silent", label: "Silencioso (solo registro)" },
          ]}
        />
        <Textarea
          label="Mensaje del Sistema"
          placeholder={`${BRAND} ha decidido que te mereces un premio. Probablemente por accidente.`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {selected && (
          <div className="well p-3 text-sm">
            <p className="font-semibold text-[var(--text-1)]">{selected.name}</p>
            <p className="text-[var(--text-cyan)]">{RARITY_LABEL[selected.rarity]}</p>
          </div>
        )}
        <Button variant={mode === "penalty" ? "danger" : "energy"} loading={loading} onClick={grant}>
          Confirmar
        </Button>
      </div>
    </GlassPanel>
  );
}
