"use client";

import { useEffect, useRef, useState } from "react";
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
import { crawlerAvatarUrl, crawlerInitials } from "@/lib/crawler-art";
import { Copy, Gift, Trash2, Pencil, UserPlus, X } from "lucide-react";

/* ── Context-menu mini-modal ── */
function CrawlerContextMenu({
  crawler,
  position,
  onClose,
  onDelete,
  onDuplicate,
  onAssignUser,
}: {
  crawler: Crawler;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (c: Crawler) => void;
  onAssignUser: (c: Crawler) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  /* Keep menu inside viewport */
  const style: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 60,
  };

  const items = [
    { icon: <Pencil size={14} />, label: "Editar", href: `/dm/crawlers/${crawler.id}` },
    { icon: <Copy size={14} />, label: "Copiar", action: () => { onDuplicate(crawler); onClose(); } },
    { icon: <UserPlus size={14} />, label: "Asignar usuario", action: () => { onAssignUser(crawler); onClose(); } },
    { icon: <Trash2 size={14} className="text-[var(--danger)]" />, label: "Eliminar", action: () => { onDelete(crawler.id); onClose(); }, danger: true },
  ];

  return (
    <div ref={ref} style={style} className="glass min-w-[180px] rounded-xl border border-[var(--stroke-cyan)] p-1 shadow-lg backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
      {items.map((item) =>
        item.href ? (
          <Link key={item.label} href={item.href} onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--text-1)] transition-colors hover:bg-white/10">
            {item.icon}
            {item.label}
          </Link>
        ) : (
          <button key={item.label} onClick={item.action}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/10 ${item.danger ? "text-[var(--danger)]" : "text-[var(--text-1)]"}`}>
            {item.icon}
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

/* ── Assign-user modal ── */
function AssignUserModal({
  crawler,
  onClose,
  onAssigned,
}: {
  crawler: Crawler;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dm/assign-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crawlerId: crawler.id, email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al asignar usuario");
      setSuccess(true);
      setTimeout(() => { onAssigned(); onClose(); }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={backdropRef} onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass w-full max-w-md rounded-2xl border border-[var(--stroke-cyan)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-base tracking-wide text-[var(--text-1)]">
            Asignar usuario a <span className="text-[var(--cyan-400)]">{crawler.name}</span>
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-[var(--text-3)] transition-colors hover:bg-white/10 hover:text-[var(--text-1)]">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-[var(--text-3)]">
          Introduce el correo electrónico del jugador. Se creará su cuenta automáticamente si no existe y se vinculará a este crawler.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email del jugador"
            type="email"
            placeholder="jugador@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
          {success && <p className="text-xs text-[var(--ok)]">✓ Usuario asignado correctamente</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="neon" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="energy" size="sm" disabled={loading}>
              {loading ? "Asignando…" : "Asignar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CrawlerCardAvatar({ crawler }: { crawler: Crawler }) {
  const src = crawlerAvatarUrl(crawler.name, crawler.portrait_url);
  if (!src) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl well font-display text-base tracking-widest text-[var(--cyan-400)] lg:h-24 lg:w-24">
        {crawlerInitials(crawler.name)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="h-20 w-20 rounded-2xl object-cover ring-1 ring-[var(--stroke-magenta)] lg:h-24 lg:w-24"
    />
  );
}

/* ── Main page ── */
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

  const [contextMenu, setContextMenu] = useState<{ crawler: Crawler; x: number; y: number } | null>(null);
  const [assignTarget, setAssignTarget] = useState<Crawler | null>(null);

  function setStartingStat(key: StatKey, next: number) {
    setForm((current) => assignStartingStat(current, key, next));
  }

  async function refreshCrawlers(sessionId: string) {
    const { data } = await supabase.from("crawlers").select("*").eq("session_id", sessionId);
    setCrawlers((data as Crawler[]) ?? []);
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
      if (sess) refreshCrawlers(sess.id);
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
    setForm({ name: "", race: "", str_base: 6, int_base: 3, con_base: 5, dex_base: 4, cha_base: 2 });
    refreshCrawlers(session.id);
  }

  async function deleteCrawler(id: string) {
    if (!session) return;
    await supabase.from("crawlers").delete().eq("id", id);
    refreshCrawlers(session.id);
  }

  async function duplicateCrawler(c: Crawler) {
    if (!session) return;
    await supabase.from("crawlers").insert({
      session_id: session.id,
      name: `${c.name} (copia)`,
      race: c.race,
      class_name: c.class_name,
      level: c.level,
      str_base: c.str_base,
      int_base: c.int_base,
      con_base: c.con_base,
      dex_base: c.dex_base,
      cha_base: c.cha_base,
      str_enhanced: c.str_enhanced,
      int_enhanced: c.int_enhanced,
      con_enhanced: c.con_enhanced,
      dex_enhanced: c.dex_enhanced,
      cha_enhanced: c.cha_enhanced,
      mana_max: c.mana_max,
      mana_current: c.mana_current,
    });
    refreshCrawlers(session.id);
  }

  function handleCardClick(e: React.MouseEvent, crawler: Crawler) {
    e.preventDefault();
    setContextMenu({ crawler, x: e.clientX, y: e.clientY });
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
          <div
            key={c.id}
            onClick={(e) => handleCardClick(e, c)}
            className="cursor-pointer rounded-[var(--r-lg)] transition-[transform,filter,box-shadow] duration-300 ease-out hover:scale-[1.006] hover:brightness-110 hover:shadow-[0_0_32px_rgba(0,212,255,0.15)]"
          >
            <GlassPanel variant="identity" className="pointer-events-none">
              <div className="flex gap-4">
                <CrawlerCardAvatar crawler={c} />
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
              <div className="mt-4 flex justify-end pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                <Link
                  href={`/dm/crawlers/${c.id}/grant`}
                  title="Otorgar"
                  aria-label="Otorgar"
                  className="flex h-9 w-9 items-center justify-center rounded-full btn-energy transition-[filter,box-shadow] duration-300 ease-out hover:brightness-125 hover:saturate-125 hover:shadow-[0_0_22px_rgba(251,146,60,0.7)]"
                >
                  <Gift size={16} />
                </Link>
              </div>
            </GlassPanel>
          </div>
        ))}
      </div>

      {contextMenu && (
        <CrawlerContextMenu
          crawler={contextMenu.crawler}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onDelete={deleteCrawler}
          onDuplicate={duplicateCrawler}
          onAssignUser={(c) => setAssignTarget(c)}
        />
      )}

      {assignTarget && (
        <AssignUserModal
          crawler={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => session && refreshCrawlers(session.id)}
        />
      )}
    </div>
  );
}
