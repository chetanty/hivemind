/** Cut-paper hive mark: a honeycomb hexagon holding a straw skep, with one bee. Same drawing as app/icon.svg. */
export function HiveLogo({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={className}
      style={{ filter: "url(#boil) var(--shadow-2)", overflow: "visible" }}
    >
      <HiveShapes />
    </svg>
  );
}

const INK = "#211c17";

export function HiveShapes() {
  return (
    <g stroke={INK} strokeLinejoin="round" strokeLinecap="round">
      {/* honeycomb cell */}
      <path d="M32 2.5 L58 17.5 L58 46.5 L32 61.5 L6 46.5 L6 17.5 Z" fill="#f2d46b" strokeWidth="2.6" />
      <path d="M32 8 L53 20 L53 44 L32 56 L11 44 L11 20 Z" fill="none" stroke="#c98a12" strokeWidth="1.2" strokeDasharray="3 2.5" />

      {/* skep: stacked straw bands */}
      <rect x="15" y="40" width="34" height="9" rx="4.5" fill="#d9a13a" strokeWidth="1.7" />
      <rect x="18" y="32.5" width="28" height="8.5" rx="4.25" fill="#e2b04a" strokeWidth="1.7" />
      <rect x="21.5" y="25.5" width="21" height="8" rx="4" fill="#d9a13a" strokeWidth="1.7" />
      <rect x="26" y="19" width="12" height="7.5" rx="3.75" fill="#e2b04a" strokeWidth="1.7" />
      {/* straw ticks */}
      <path d="M22 44.5 h3 M30 44.5 h3 M38 44.5 h3 M25 37 h3 M34 37 h3 M28 29.5 h3 M35 29.5 h2" stroke="#8c6440" strokeWidth="1.2" />
      {/* board + entrance */}
      <rect x="12" y="48.5" width="40" height="4" rx="1" fill="#8c6440" strokeWidth="1.7" />
      <path d="M27.5 49 a4.5 4.5 0 0 1 9 0 Z" fill={INK} strokeWidth="1.2" />

      {/* bee */}
      <g transform="translate(48 13) rotate(-18)">
        <ellipse cx="-2" cy="-4.5" rx="3.2" ry="2.4" fill="#fffaf0" strokeWidth="1" />
        <ellipse cx="2.2" cy="-4.8" rx="2.8" ry="2.1" fill="#fffaf0" strokeWidth="1" />
        <ellipse cx="0" cy="0" rx="5" ry="3.4" fill="#f2c230" strokeWidth="1.3" />
        <path d="M-1.4 -3.2 v6.4 M1.6 -3.2 v6.4" stroke={INK} strokeWidth="1.5" />
        <circle cx="5.4" cy="-0.4" r="1.6" fill={INK} strokeWidth="0" />
      </g>
      {/* flight path */}
      <path d="M40.5 15.5 q-3 2 -6 0.5" fill="none" strokeWidth="1" strokeDasharray="1.6 2" />
    </g>
  );
}
