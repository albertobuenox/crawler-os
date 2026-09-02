import { healthBoxValue } from "@/lib/rules";
import { cn } from "@/lib/utils";

interface HealthBoxesProps {
  boxesFilled: number;
  conEnhanced: number;
  className?: string;
}

/** CarlRPG: 10 boxes, each worth CON mod */
export function HealthBoxes({ boxesFilled, conEnhanced, className }: HealthBoxesProps) {
  const boxValue = healthBoxValue(conEnhanced);
  const filled = Math.min(Math.max(boxesFilled, 0), 10);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-label">Health Bar</span>
        <span className="font-stat text-sm text-[var(--hp)]">
          {10 - filled}/10 boxes · {boxValue} HP each
        </span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <div
              key={i}
              title={`Box ${i + 1}${isFilled ? " (damaged)" : ""}`}
              className={cn(
                "aspect-square rounded-sm border transition-colors",
                isFilled
                  ? "border-[var(--hp)] bg-[var(--hp)] shadow-[var(--glow-danger)]"
                  : "border-[var(--stroke-glass)] bg-[rgba(255,255,255,0.04)]"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ResourceBarProps {
  label: string;
  current: number;
  max: number;
  color?: string;
}

export function ResourceBar({
  label,
  current,
  max,
  color = "var(--mana)",
}: ResourceBarProps) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-label">{label}</span>
        <span className="font-stat text-[var(--text-2)]">
          {current}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--void-800)]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            boxShadow: `0 0 12px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}
