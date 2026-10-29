import type { CSSProperties, ReactNode } from "react";
import { tornClip, tiltFor, type Edges } from "./torn";

interface PaperProps {
  seed: string;
  color?: string;
  edges?: Edges;
  jag?: number;
  depth?: 1 | 2 | 3;
  /** number = fixed tilt, true = seeded ±2°, false = none */
  tilt?: number | boolean;
  boil?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** A cut/torn paper card: the sheet (clipped, textured, shadowed, boiling) sits behind unfiltered content. */
export function Paper({
  seed,
  color = "var(--cream)",
  edges,
  jag,
  depth = 2,
  tilt = true,
  boil = true,
  className = "",
  style,
  children,
}: PaperProps) {
  const rotate = typeof tilt === "number" ? tilt : tilt ? tiltFor(seed) : 0;
  return (
    <div className={`paper ${className}`} style={{ rotate: `${rotate}deg`, ...style }}>
      <div aria-hidden className="paper-back" data-depth={depth} data-boil={boil}>
        <div className="paper-sheet" style={{ backgroundColor: color, clipPath: tornClip(seed, edges, jag) }} />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export function Tape({ className = "", rotate = -4 }: { className?: string; rotate?: number }) {
  return <span aria-hidden className={`tape ${className}`} style={{ rotate: `${rotate}deg` }} />;
}

export function Pin({ color = "var(--st-condemn)", className = "" }: { color?: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 40" width="26" height="32" className={`absolute z-10 ${className}`}>
      <ellipse cx="19" cy="37" rx="6" ry="2" fill="rgba(0,0,0,.25)" />
      <path d="M16 20 L18 36" stroke="#6d6d6d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="13" r="10" fill={color} stroke="var(--ink)" strokeWidth="1.5" />
      <circle cx="12.5" cy="9.5" r="3" fill="rgba(255,255,255,.55)" />
    </svg>
  );
}
