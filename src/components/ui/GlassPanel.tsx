import { cn } from "@/lib/utils";

type GlassVariant = "default" | "system" | "identity" | "nested" | "danger" | "reward";

const variantClass: Record<GlassVariant, string> = {
  default: "",
  system: "bg-[var(--glass-cyan)]",
  identity: "bg-[var(--glass-magenta)]",
  nested: "well !backdrop-filter-none",
  danger: "bg-[var(--glass-danger)] border-[var(--stroke-danger)]",
  reward: "bg-[var(--glass-reward)] border-[var(--stroke-reward)]",
};

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassVariant;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function GlassPanel({
  variant = "default",
  title,
  subtitle,
  action,
  className,
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden p-5",
        variant !== "nested" && variantClass[variant],
        variant === "nested" && variantClass.nested,
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="font-display text-sm font-bold tracking-[0.06em] text-[var(--text-1)]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-xs text-[var(--text-cyan)]">{subtitle}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
