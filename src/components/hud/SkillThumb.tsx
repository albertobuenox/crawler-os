"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { SkillHoverTip } from "@/components/hud/SkillHoverTip";
import { skillArtUrl } from "@/lib/skill-art";
import { toSkillTip } from "@/lib/skill-tip";
import type { Skill, SkillCatalogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZE = {
  xs: { box: "h-6 w-6", icon: 10, radius: "rounded-[5px]" },
  sm: { box: "h-8 w-8", icon: 14, radius: "rounded-[7px]" },
  md: { box: "h-10 w-10", icon: 16, radius: "rounded-[8px]" },
} as const;

export function useSkillArt(
  slug?: string | null,
  skillType?: Skill["skill_type"] | null,
  thumbUrl?: string | null
) {
  const src = skillArtUrl(slug, skillType, thumbUrl);
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  return {
    src,
    ready: Boolean(src && !failed),
    markFailed: () => setFailed(true),
  };
}

export function SkillThumb({
  slug,
  skillType,
  thumbUrl,
  size = "sm",
  className,
  tip,
}: {
  slug?: string | null;
  skillType?: Skill["skill_type"] | null;
  thumbUrl?: string | null;
  size?: keyof typeof SIZE;
  className?: string;
  tip?: Skill | SkillCatalogEntry | null;
}) {
  const { src, ready, markFailed } = useSkillArt(slug, skillType, thumbUrl);
  const spec = SIZE[size];

  const icon = (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-[var(--stroke-magenta)] bg-[rgba(232,121,249,0.08)]",
        spec.box,
        spec.radius,
        className
      )}
    >
      {ready && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={markFailed} />
      ) : (
        <Sparkles size={spec.icon} strokeWidth={1.75} className="text-[var(--magenta-400)] opacity-55" />
      )}
    </span>
  );

  if (!tip) return icon;
  return <SkillHoverTip info={toSkillTip(tip)}>{icon}</SkillHoverTip>;
}
