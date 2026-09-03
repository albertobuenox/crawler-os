"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TableCanvas } from "@/components/hud/TableCanvas";
import type { GameSession, TableState, MapPin, Resource } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { useSessionBroadcast } from "@/hooks/useSession";

export default function DMTablePage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { broadcast } = useSessionBroadcast(session?.id, () => {});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase.from("session_members").select("sessions(*)").eq("user_id", user.id).limit(1).maybeSingle();
    const sess = castSession(member?.sessions);
    setSession(sess ?? null);
    if (sess) {
      const [{ data: ts }, { data: p }, { data: r }] = await Promise.all([
        supabase.from("table_state").select("*").eq("session_id", sess.id).maybeSingle(),
        supabase.from("map_pins").select("*").eq("session_id", sess.id),
        supabase.from("resources").select("*").eq("session_id", sess.id),
      ]);
      setTableState(ts as TableState);
      setPins((p as MapPin[]) ?? []);
      setResources((r as Resource[]) ?? []);
    }
  }

  async function showOnTable(type: TableState["shown_type"], extra: Partial<TableState> = {}) {
    if (!session) return;
    const update = {
      shown_type: type,
      resource_id: selectedResource || null,
      title: title || null,
      body_text: body || null,
      ...extra,
    };
    await supabase.from("table_state").update(update).eq("session_id", session.id);
    await broadcast("table_update", update);
    load();
  }

  async function addPin() {
    if (!session) return;
    await supabase.from("map_pins").insert({
      session_id: session.id,
      label: "Grupo",
      pin_type: "party",
      x: 0.5,
      y: 0.5,
      color: "#00D4FF",
    });
    load();
  }

  const shownResource = resources.find((r) => r.id === tableState?.resource_id);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <GlassPanel className="lg:col-span-2" title="Mesa" subtitle="Se muestra a todos los crawlers en tiempo real">
        <TableCanvas tableState={tableState} resource={shownResource} pins={pins} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="neon" size="sm" onClick={() => showOnTable("text")}>Mostrar texto</Button>
          <Button variant="neon" size="sm" onClick={() => showOnTable("item")}>Mostrar objeto</Button>
          <Button variant="neon" size="sm" onClick={() => showOnTable("map", { show_grid: true })}>Mostrar mapa</Button>
          <Button variant="ghost" size="sm" onClick={() => showOnTable("none")}>Limpiar</Button>
          <Button variant="ghost" size="sm" onClick={addPin}>Añadir chincheta</Button>
        </div>
      </GlassPanel>
      <GlassPanel title="Controles de pantalla">
        <div className="space-y-3">
          <SelectResource resources={resources} value={selectedResource} onChange={setSelectedResource} />
          <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Cuerpo" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      </GlassPanel>
    </div>
  );
}

function SelectResource({ resources, value, onChange }: { resources: Resource[]; value: string; onChange: (v: string) => void }) {
  return (
    <select className="well h-11 w-full px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Seleccionar recurso...</option>
      {resources.map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  );
}
