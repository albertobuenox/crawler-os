import type { CSSProperties } from "react";

type DieIconProps = {
  className?: string;
  style?: CSSProperties;
};

function DieMask({ src, className, style }: DieIconProps & { src: string }) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: "block",
        backgroundColor: "currentColor",
        WebkitMask: `url("${src}") center / contain no-repeat`,
        mask: `url("${src}") center / contain no-repeat`,
        ...style,
      }}
    />
  );
}

export function D2Icon(props: DieIconProps) {
  return <DieMask src="/dice/d2.svg" {...props} />;
}

export function D4Icon(props: DieIconProps) {
  return <DieMask src="/dice/d4.svg" {...props} />;
}

export function D6Icon(props: DieIconProps) {
  return <DieMask src="/dice/d6.svg" {...props} />;
}

export function D8Icon(props: DieIconProps) {
  return <DieMask src="/dice/d8.svg" {...props} />;
}

export function D10Icon(props: DieIconProps) {
  return <DieMask src="/dice/d10.svg" {...props} />;
}

export function D20Icon(props: DieIconProps) {
  return <DieMask src="/dice/d20.svg" {...props} />;
}

export const DIE_ICONS = {
  2: D2Icon,
  4: D4Icon,
  6: D6Icon,
  8: D8Icon,
  10: D10Icon,
  20: D20Icon,
} as const;
