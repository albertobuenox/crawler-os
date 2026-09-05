import {
  RESOURCE_TYPE_MARK_LABEL,
  RESOURCE_TYPE_MARK_SRC,
  resourceTypeMark,
} from "@/lib/resources";
import type { Resource } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-6 w-6 rounded-[7px]",
  md: "h-7 w-7 rounded-[8px]",
} as const;

export function ResourceKindMark({
  resource,
  size = "md",
  className,
}: {
  resource: Pick<Resource, "kind" | "item_category" | "equip_slot" | "payload"> | null | undefined;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const mark = resourceTypeMark(resource);
  if (!mark) return null;
  const label = RESOURCE_TYPE_MARK_LABEL[mark];

  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 overflow-hidden border border-[var(--stroke-glass)] bg-[rgba(8,10,18,0.85)]",
        SIZE[size],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={RESOURCE_TYPE_MARK_SRC[mark]} alt="" className="h-full w-full object-cover" />
    </span>
  );
}
