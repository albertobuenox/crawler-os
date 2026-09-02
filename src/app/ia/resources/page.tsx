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

const KINDS: ResourceKind[] = [
  "item", "achievement", "map", "monster", "npc", "box", "buff", "debuff", "quest", "floor", "skill_template",
];

const RARITIES: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "celestial"];

export default function IAResourcesPage() {
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
        <h2 className="font-display text-xl">Resources</h2>
        <Button variant="energy" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Nuevo Recurso"}
        </Button>
      </div>

      {showForm && (
        <GlassPanel title="Resource editor">
          <form onSubmit={createResource} className="grid gap-4 lg:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ResourceKind })} options={KINDS.map((k) => ({ value: k, label: k }))} />
            <Select label="Rarity" value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value as Rarity })} options={RARITIES.map((r) => ({ value: r, label: r }))} />
            <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Textarea label="System copy" className="lg:col-span-2" value={form.system_copy} onChange={(e) => setForm({ ...form, system_copy: e.target.value })} />
            <Button type="submit" variant="session">Save Resource</Button>
          </form>
        </GlassPanel>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === "all" ? "neon" : "ghost"} size="sm" onClick={() => setFilter("all")}>All</Button>
        {KINDS.map((k) => (
          <Button key={k} variant={filter === k ? "neon" : "ghost"} size="sm" onClick={() => setFilter(k)}>{k}</Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl well">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--stroke-glass)] text-left text-label">
              <th className="p-3">Name</th>
              <th className="p-3">Kind</th>
              <th className="p-3">Rarity</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.04)]">
                <td className="p-3 font-medium text-[var(--text-1)]">{r.name}</td>
                <td className="p-3 capitalize text-[var(--text-3)]">{r.kind}</td>
                <td className="p-3 capitalize" style={{ color: RARITY_COLORS[r.rarity] }}>{r.rarity}</td>
                <td className="p-3">
                  <Link href={`/ia/resources/${r.id}`}>
                    <Button variant="ghost" size="sm">Edit</Button>
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
