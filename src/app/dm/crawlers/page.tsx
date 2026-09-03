"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { ResourceBar, HealthBoxes } from "@/components/hud/HealthBoxes";
import type { Crawler, GameSession } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { statModifier } from "@/lib/rules";
import { STATUS_LABEL } from "@/lib/copy";

export default function DMCrawlersPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    race: "",
    class_name: "",
    level: 1,
    str_base: 10,
    int_base: 10,
    con_base: 10,
    dex_base: 10,
    cha_base: 10,
  });

  useEffect(() => {
    (async () => {
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
        const { data } = await supabase.from("crawlers").select("*").eq("session_id", sess.id);
        setCrawlers((data as Crawler[]) ?? []);
      }
    })();
  }, [supabase]);

  async function createCrawler(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    const conMod = statModifier(form.con_base);
    await supabase.from("crawlers").insert({
      session_id: session.id,
      name: form.name,
      race: form.race,
      class_name: form.class_name,
      level: form.level,
      str_base: form.str_base,
      int_base: form.int_base,
      con_base: form.con_base,
      dex_base: form.dex_base,
      cha_base: form.cha_base,
      str_enhanced: form.str_base,
      int_enhanced: form.int_base,
      con_enhanced: form.con_base,
      dex_enhanced: form.dex_base,
      cha_enhanced: form.cha_base,
      mana_max: form.int_base,
      mana_current: form.int_base,
    });
    setShowForm(false);
    const { data } = await supabase.from("crawlers").select("*").eq("session_id", session.id);
    setCrawlers((data as Crawler[]) ?? []);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h2 className="font-display text-xl">Crawlers</h2>
        <Button variant="session" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancelar" : "Nuevo crawler"}
        </Button>
      </div>

      {showForm && (
        <GlassPanel title="Crear crawler">
          <form onSubmit={createCrawler} className="grid gap-4 sm:grid-cols-2">
            <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Raza" value={form.race} onChange={(e) => setForm({ ...form, race: e.target.value })} />
            <Input label="Clase" value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
            <Input label="Nivel" type="number" value={form.level} onChange={(e) => setForm({ ...form, level: +e.target.value })} />
            {(["str", "int", "con", "dex", "cha"] as const).map((s) => (
              <Input
                key={s}
                label={s.toUpperCase()}
                type="number"
                value={form[`${s}_base`]}
                onChange={(e) => setForm({ ...form, [`${s}_base`]: +e.target.value })}
              />
            ))}
            <div className="sm:col-span-2">
              <Button type="submit" variant="energy">Crear</Button>
            </div>
          </form>
        </GlassPanel>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {crawlers.map((c) => (
          <GlassPanel key={c.id} variant="identity">
            <div className="flex gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl well text-2xl">👤</div>
              <div>
                <h3 className="font-display text-lg">{c.name}</h3>
                <p className="text-xs text-[var(--text-cyan)]">
                  LV {c.level} · {c.class_name ?? "—"}
                </p>
                <p className="text-xs text-[var(--text-3)]">{STATUS_LABEL[c.status]}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <HealthBoxes boxesFilled={c.hp_boxes_filled} conEnhanced={c.con_enhanced} />
              <ResourceBar label="Maná" current={c.mana_current} max={c.mana_max} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/dm/crawlers/${c.id}`}>
                <Button variant="neon" size="sm">Hoja</Button>
              </Link>
              <Link href={`/dm/crawlers/${c.id}/skills`}>
                <Button variant="neon" size="sm">Habilidades</Button>
              </Link>
              <Link href={`/dm/crawlers/${c.id}/grant`}>
                <Button variant="energy" size="sm">Otorgar</Button>
              </Link>
            </div>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
