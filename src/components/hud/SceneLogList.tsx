"use client";

import Link from "next/link";
import { BRAND } from "@/lib/copy";
import { crawlerSheetHref, sceneStatLabel, sceneVitalLabel, type SceneLogItem } from "@/lib/scene-log";
import { cn } from "@/lib/utils";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CrawlerChip({
  crawlerId,
  name,
  viewer,
}: {
  crawlerId: string | null;
  name: string;
  viewer: "dm" | "crawler";
}) {
  if (!crawlerId) {
    return <span className="font-semibold text-[var(--text-1)]">{name}</span>;
  }
  return (
    <Link
      href={crawlerSheetHref(crawlerId, viewer)}
      title={`Abrir hoja de ${name}`}
      className={cn(
        "inline-flex translate-y-px items-center rounded-full border border-[var(--stroke-glass)]",
        "bg-[rgba(255,255,255,0.05)] px-1.5 py-px font-semibold text-[var(--text-1)]",
        "transition-colors duration-[var(--t-ui)]",
        "hover:border-[var(--stroke-cyan)] hover:text-[var(--cyan-300)]"
      )}
    >
      {name}
    </Link>
  );
}

function DieChip({ formula }: { formula: string }) {
  return (
    <span
      title={formula}
      className={cn(
        "inline-flex h-[1.35rem] min-w-[1.35rem] translate-y-px items-center justify-center",
        "rounded-[5px] border border-[var(--stroke-cyan)] bg-[rgba(0,212,255,0.08)] px-1",
        "font-stat text-[10px] font-semibold tracking-wide text-[var(--cyan-300)]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
      )}
    >
      {formula}
    </span>
  );
}

function Amount({
  value,
  tone,
}: {
  value: number;
  tone: "loss" | "gain" | "neutral";
}) {
  return (
    <strong
      className={cn(
        "font-semibold",
        tone === "loss" && "text-[var(--danger)]",
        tone === "gain" && "text-[var(--ok)]",
        tone === "neutral" && "text-[var(--text-1)]"
      )}
    >
      {value}
    </strong>
  );
}

function LogLine({ item, viewer }: { item: SceneLogItem; viewer: "dm" | "crawler" }) {
  return (
    <li className="rounded px-1.5 py-1">
      <p className="font-mono-system text-[11px] leading-5 text-[var(--text-2)]">
        <span className="text-[10px] text-[var(--text-4)]">{formatTime(item.created_at)}</span>{" "}
        {item.kind === "scene_roll" && (
          <>
            Mazmorrero{" "}
            <CrawlerChip crawlerId={item.crawlerId} name={item.crawlerName} viewer={viewer} />{" "}
            lanzó <DieChip formula={item.formula} /> ={" "}
            <Amount value={item.value} tone="neutral" />
          </>
        )}
        {item.kind === "vital" && (
          <>
            Mazmorrero{" "}
            <CrawlerChip crawlerId={item.crawlerId} name={item.crawlerName} viewer={viewer} />{" "}
            {item.to < item.from ? "ha perdido" : "ha recuperado"}{" "}
            <Amount value={item.amount} tone={item.to < item.from ? "loss" : "gain"} /> de{" "}
            {sceneVitalLabel(item.field)}
          </>
        )}
        {item.kind === "stat" && (
          <>
            Mazmorrero{" "}
            <CrawlerChip crawlerId={item.crawlerId} name={item.crawlerName} viewer={viewer} />{" "}
            {item.to < item.from ? "ha bajado" : "ha subido"} {sceneStatLabel(item.stat)} en{" "}
            <Amount value={item.amount} tone={item.to < item.from ? "loss" : "gain"} />
          </>
        )}
        {item.kind === "plain" && (
          <>
            {item.crawlerId ? (
              <>
                <CrawlerChip crawlerId={item.crawlerId} name={item.crawlerName ?? "Crawler"} viewer={viewer} />{" "}
              </>
            ) : null}
            <span>{item.message}</span>
          </>
        )}
      </p>
    </li>
  );
}

export function SceneLogList({
  items,
  viewer,
  ready,
  sessionId,
}: {
  items: SceneLogItem[];
  viewer: "dm" | "crawler";
  ready: boolean;
  sessionId?: string;
}) {
  if (!ready || !sessionId) {
    return (
      <li className="font-mono-system text-xs text-[var(--text-3)]">
        {`Sincronizando el log de ${BRAND}…`}
      </li>
    );
  }
  if (items.length === 0) {
    return (
      <li className="font-mono-system text-xs text-[var(--text-3)]">
        Sin tiradas. El dungeon observa.
      </li>
    );
  }
  return (
    <>
      {items.map((item) => (
        <LogLine key={item.id} item={item} viewer={viewer} />
      ))}
    </>
  );
}
