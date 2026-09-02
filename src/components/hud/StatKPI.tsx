import { cn } from "@/lib/utils";

interface StatKPIProps {
  label: string;
  value: string | number;
  sublabel?: string;
  className?: string;
}

export function StatKPI({ label, value, sublabel, className }: StatKPIProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="font-stat text-3xl text-[var(--cyan-400)]">{value}</span>
      <span className="text-label">{label}</span>
      {sublabel && <span className="text-xs text-[var(--text-4)]">{sublabel}</span>}
    </div>
  );
}

interface StatGridProps {
  stats: { key: string; value: number; mod?: number }[];
}

export function StatGrid({ stats }: StatGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.key} className="well p-3 text-center">
          <div className="text-label">{s.key}</div>
          <div className="font-stat text-2xl text-[var(--cyan-400)]">{s.value}</div>
          {s.mod !== undefined && (
            <div className="text-xs text-[var(--text-3)]">
              {s.mod >= 0 ? "+" : ""}
              {s.mod}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
