import { cn } from "@/lib/utils";

type ButtonVariant = "energy" | "neon" | "session" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantClass: Record<ButtonVariant, string> = {
  energy: "btn-energy hover:brightness-110",
  neon: "btn-neon hover:brightness-110",
  session: "btn-session hover:brightness-110",
  ghost:
    "border-0 bg-transparent text-[var(--text-2)] shadow-none hover:text-[var(--text-1)] hover:underline",
  danger:
    "border border-[var(--danger)] bg-[rgba(255,59,92,0.12)] text-[var(--danger)] shadow-[var(--glow-danger)]",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = "neon",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--r-md)] font-medium transition-all duration-[var(--t-ui)] disabled:cursor-not-allowed disabled:opacity-45",
        variantClass[variant],
        sizeClass[size],
        variant === "energy" || variant === "session" ? "rounded-[var(--r-pill)]" : "",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
