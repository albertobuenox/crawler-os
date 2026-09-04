"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SceneDiceCeremony } from "@/components/hud/SceneDiceCeremony";
import { useSceneDiceApi } from "@/components/hud/SceneDiceProvider";
import { crawlerAvatarUrl, crawlerInitials, type AvatarEmotion } from "@/lib/crawler-art";

export function CrawlerDiceLayer() {
  const pathname = usePathname();
  const dice = useSceneDiceApi();
  const choosing = dice.state?.mode === "choosing" ? dice.state : null;
  const ceremony = dice.state?.mode === "ceremony" ? dice.state : null;
  const onTable = pathname.startsWith("/crawler/table");
  const canRoll = !!dice.selfId && ceremony?.crawlerId === dice.selfId && ceremony.value == null;

  return (
    <>
      <AnimatePresence>
        {choosing && !onTable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-[46] bg-[rgba(5,6,13,0.72)] backdrop-blur-[6px]"
          />
        )}
      </AnimatePresence>
      {choosing && !onTable && (
        <RemoteChooserChip
          name={choosing.name}
          emotion={choosing.emotion}
          portraitUrl={choosing.portraitUrl}
        />
      )}
      <SceneDiceCeremony
        state={ceremony}
        canRoll={canRoll}
        onRoll={dice.revealRoll}
        onClose={dice.closeCeremony}
      />
    </>
  );
}

function RemoteChooserChip({
  name,
  emotion,
  portraitUrl,
}: {
  name: string;
  emotion: AvatarEmotion | null;
  portraitUrl: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const src = !failed ? crawlerAvatarUrl(name, portraitUrl, emotion) : null;
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-[47] flex items-center gap-3">
      <span className="relative flex h-16 w-16 overflow-hidden rounded-[14px] border-2 border-[var(--cyan-400)] bg-[rgba(8,10,18,0.92)] shadow-[var(--glow-cyan)]">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-sm text-[var(--cyan-300)]">
            {crawlerInitials(name)}
          </span>
        )}
      </span>
      <div className="rounded-[12px] border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.9)] px-3 py-2 shadow-[var(--glow-cyan)] backdrop-blur-md">
        <p className="font-display text-[11px] tracking-[0.12em] text-[var(--cyan-300)]">{name}</p>
        <p className="text-[11px] leading-snug text-[var(--text-2)]">está eligiendo dado</p>
      </div>
    </div>
  );
}
