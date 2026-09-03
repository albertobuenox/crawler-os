"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import type { GameSession, Resource, ResourceKind, Rarity } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { RARITY_COLORS } from "@/lib/types";
import { kindOptions, rarityOptions, KIND_LABEL, RARITY_LABEL } from "@/lib/copy";

const KINDS: ResourceKind[] = [
  "item", "achievement", "map", "monster", "npc", "box", "buff", "debuff", "quest", "floor", "skill_template",
];

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "celestial"];

export default function DMResourcesPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "item" as ResourceKind,
    rarity: "common" as Rarity,
    description: "",
    system_copy: "",
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: member } = await supabase
      .from("session_members")
      .select("sessions(*)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const sess = castSession(member?.sessions);
    setSession(sess ?? null);
    if (sess) {
      const { data } = await supabase.from("resources").select("*").eq("session_id", sess.id).order("created_at", { ascending: false });
      setResources((data as Resource[]) ?? []);
    }
  }

  async function createResource(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    await supabase.from("resources").insert({ session_id: session.id, ...form, payload: {} });
    setShowForm(false);
    load();
  }

  const filtered = filter === "all" ? resources : resources.filter((r) => r.kind === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <h2 className="font-display text-xl">Recursos</h2>
        <Button variant="energy" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Nuevo recurso"}
        </Button>
      </div>

      {showForm && (
        <GlassPanel title="Editor de recursos">
          <form onSubmit={createResource} className="grid gap-4 lg:grid-cols-2">
            <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Tipo" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ResourceKind })} options={kindOptions(KINDS)} />
            <Select label="Rareza" value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value as Rarity })} options={rarityOptions(RARITIES)} />
            <Textarea label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Textarea label="Copy del Sistema" className="lg:col-span-2" value={form.system_copy} onChange={(e) => setForm({ ...form, system_copy: e.target.value })} />
            <Button type="submit" variant="session">Guardar recurso</Button>
          </form>
        </GlassPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "neon" : "ghost"} size="sm" onClick={() => setFilter("all")}>Todo</Button>
        {KINDS.map((k) => (
          <Button key={k} variant={filter === k ? "neon" : "ghost"} size="sm" onClick={() => setFilter(k)}>{KIND_LABEL[k]}</Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl well">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--stroke-glass)] text-left text-label">
              <th className="p-3">Nombre</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Rareza</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.04)]">
                <td className="p-3 font-medium text-[var(--text-1)]">{r.name}</td>
                <td className="p-3 text-[var(--text-3)]">{KIND_LABEL[r.kind]}</td>
                <td className="p-3" style={{ color: RARITY_COLORS[r.rarity] }}>{RARITY_LABEL[r.rarity]}</td>
                <td className="p-3">
                  <Link href={`/dm/resources/${r.id}`}>
                    <Button variant="ghost" size="sm">Editar</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
