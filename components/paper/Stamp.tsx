import { STANCE_LABEL, type Stance } from "@/lib/types";

export const stanceColor = (s: Stance) => `var(--st-${s})`;

export function Stamp({ stance, className = "", rotate = -8 }: { stance: Stance; className?: string; rotate?: number }) {
  return (
    <span className={`stamp text-sm ${className}`} style={{ color: stanceColor(stance), rotate: `${rotate}deg` }}>
      {STANCE_LABEL[stance]}
    </span>
  );
}
