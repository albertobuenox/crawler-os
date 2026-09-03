"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ResourceBar, HealthBoxes } from "@/components/hud/HealthBoxes";
import type { Crawler, GameSession, StatKey } from "@/lib/types";
import { STAT_LABELS } from "@/lib/types";
import { castSession } from "@/lib/utils";
import { assignStartingStat, formatStat, STARTING_STAT_VALUES, STAT_KEYS } from "@/lib/rules";
import { crawlerClassLabel, STATUS_LABEL } from "@/lib/copy";

export default function DMCrawlersPage() {
  const supabase = createClient();
  const [session, setSession] = useState<GameSession | null>(null);
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    race: "",
    str_base: 6,
    int_base: 3,
    con_base: 5,
    dex_base: 4,
    cha_base: 2,
  });

  function setStartingStat(key: StatKey, next: number) {
    setForm((current) => assignStartingStat(current, key, next));
  }

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
    await supabase.from("crawlers").insert({
      session_id: session.id,
      name: form.name,
      race: form.race || null,
      class_name: null,
      level: 1,
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
    setForm({
      name: "",
      race: "",
      str_base: 6,
      int_base: 3,
      con_base: 5,
      dex_base: 4,
      cha_base: 2,
    });
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
            <p className="sm:col-span-2 text-xs text-[var(--text-3)]">
              Asigna 02, 03, 04, 05 y 06. Cada valor una vez. Subirán más adelante. La clase se adquiere después.
            </p>
            {STAT_KEYS.map((s) => (
              <Select
                key={s}
                label={STAT_LABELS[s]}
                value={String(form[`${s}_base`])}
                onChange={(e) => setStartingStat(s, Number(e.target.value))}
                options={STARTING_STAT_VALUES.map((n) => ({
                  value: String(n),
                  label: formatStat(n),
                }))}
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
                  LV {c.level} · {crawlerClassLabel(c.class_name)}
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
