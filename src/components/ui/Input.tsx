import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "well h-11 w-full px-3 text-sm text-[var(--text-1)] outline-none transition-shadow",
          "placeholder:text-[var(--text-4)] focus:border-[var(--stroke-cyan-hot)] focus:shadow-[var(--glow-cyan)]",
          error && "border-[var(--stroke-danger)]",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "well min-h-[88px] w-full resize-y px-3 py-2 text-sm text-[var(--text-1)] outline-none",
          "focus:border-[var(--stroke-cyan-hot)] focus:shadow-[var(--glow-cyan)]",
          className
        )}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          "well h-11 w-full px-3 text-sm text-[var(--text-1)] outline-none",
          "focus:border-[var(--stroke-cyan-hot)]",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[var(--void-900)]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
