import { cn } from "@/lib/utils";

type TooltipSide = "right" | "left" | "bottom";

const sideClass: Record<TooltipSide, string> = {
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2",
};

export function HudTooltip({
  text,
  side = "right",
  className,
  children,
}: {
  text: string;
  side?: TooltipSide;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("relative", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[var(--z-drop)] whitespace-nowrap rounded-lg border border-[var(--stroke-cyan)] bg-[rgba(5,6,13,0.94)] px-2 py-1",
          "font-ui text-[11px] text-[var(--text-1)] shadow-[var(--shadow-glass)]",
          "opacity-0 transition-opacity duration-[var(--t-ui)] ease-[var(--ease-hologram)]",
          "group-hover:opacity-100 group-focus-within:opacity-100",
          sideClass[side]
        )}
      >
        {text}
      </span>
    </span>
  );
}
