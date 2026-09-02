"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import type { Skill } from "@/lib/types";

export default function IASkillsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [form, setForm] = useState({ name: "", skill_type: "utility", rank: 0, linked_stat: "str" });

  useEffect(() => {
    supabase.from("skills").select("*").eq("crawler_id", id).then(({ data }) => setSkills((data as Skill[]) ?? []));
  }, [id, supabase]);

  async function addSkill(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("skills").insert({ crawler_id: id, ...form, linked_stat: form.linked_stat as Skill["linked_stat"] });
    const { data } = await supabase.from("skills").select("*").eq("crawler_id", id);
    setSkills((data as Skill[]) ?? []);
  }

  async function markCheck(skillId: string, marks: number) {
    await supabase.from("skills").update({ check_marks: marks }).eq("id", skillId);
    const { data } = await supabase.from("skills").select("*").eq("crawler_id", id);
    setSkills((data as Skill[]) ?? []);
  }

  return (
    <GlassPanel title="Skills editor">
      <form onSubmit={addSkill} className="mb-6 grid gap-3 sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Select label="Type" value={form.skill_type} onChange={(e) => setForm({ ...form, skill_type: e.target.value })} options={["attack","spell","utility","passive"].map((t) => ({ value: t, label: t }))} />
        <Input label="Rank" type="number" value={form.rank} onChange={(e) => setForm({ ...form, rank: +e.target.value })} />
        <Select label="Stat" value={form.linked_stat} onChange={(e) => setForm({ ...form, linked_stat: e.target.value })} options={["str","int","con","dex","cha"].map((s) => ({ value: s, label: s.toUpperCase() }))} />
        <Button type="submit" variant="session">Add Skill</Button>
      </form>
      <ul className="space-y-2">
        {skills.map((s) => (
          <li key={s.id} className="well flex items-center justify-between px-3 py-2 text-sm">
            <span>{s.name} (rank {s.rank}) — checks: {s.check_marks}</span>
            <Button variant="neon" size="sm" onClick={() => markCheck(s.id, s.check_marks + 1)}>+ Check</Button>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
