import type { CharacterCard } from "@/lib/types";

const INK = "#211c17";

/** Cut-paper portrait built from a handful of flat shapes. */
export function Portrait({ look, className = "" }: { look: NonNullable<CharacterCard["look"]>; className?: string }) {
  const { skin, accent, accessory } = look;
  const hood = accessory === "hood";
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden style={{ filter: "url(#boil) var(--shadow-1)" }}>
      {/* back hair / hood */}
      {accessory === "glasses" && <path d="M26 46 C 22 16, 78 16, 74 46 L 78 86 L 22 86 Z" fill={INK} />}
      {accessory === "scarf" && <circle cx="50" cy="20" r="10" fill="#7a4a2a" />}
      {hood && <path d="M20 70 C 14 20, 86 20, 80 70 Z" fill="#3b3b3b" />}

      {/* shoulders */}
      <path d="M8 110 C 10 82, 28 72, 50 72 C 72 72, 90 82, 92 110 Z" fill={accessory === "tie" ? "#f1efe9" : hood ? "#3b3b3b" : accent} />
      {accessory === "tie" && (
        <>
          <path d="M8 110 C 10 82, 26 74, 40 72 L 46 110 Z" fill={accent === "#d9a13a" ? "#2a3550" : INK} />
          <path d="M92 110 C 90 82, 74 74, 60 72 L 54 110 Z" fill={accent === "#d9a13a" ? "#2a3550" : INK} />
          <path d="M47 74 L 53 74 L 55 100 L 50 106 L 45 100 Z" fill={accent} />
        </>
      )}
      <rect x="43" y="60" width="14" height="14" fill={skin} />
      {accessory === "scarf" && <path d="M30 72 C 40 66, 60 66, 70 72 L 66 80 C 56 76, 44 76, 34 80 Z" fill={accent} />}

      {/* head */}
      <ellipse cx="50" cy="45" rx="19" ry="22" fill={hood ? "#1e1e1e" : skin} />

      {/* face */}
      {hood ? (
        <>
          <circle cx="43" cy="46" r="2.2" fill="#e8e2d2" />
          <circle cx="57" cy="46" r="2.2" fill="#e8e2d2" />
        </>
      ) : (
        <>
          <circle cx="43" cy="46" r="1.8" fill={INK} />
          <circle cx="57" cy="46" r="1.8" fill={INK} />
          {accessory === "npc" ? (
            // NPC: identical blank stare and a flat line for a mouth
            <path d="M44 58 L 56 58" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
          ) : (
            <path d="M44 57 Q 50 60, 56 57" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          )}
        </>
      )}

      {/* accessories on top */}
      {accessory === "cap" && (
        <>
          <path d="M30 38 C 30 16, 70 16, 70 38 Z" fill={accent} />
          <path d="M28 38 L 82 37 L 78 43 L 30 42 Z" fill={accent} stroke={INK} strokeWidth="0.8" />
          <rect x="44" y="24" width="12" height="7" fill="#f1efe9" />
        </>
      )}
      {accessory === "glasses" && (
        <>
          <path d="M31 40 C 34 22, 66 22, 69 40 C 60 30, 40 30, 31 40 Z" fill={INK} />
          <circle cx="43" cy="46" r="6" fill="none" stroke={accent} strokeWidth="2" />
          <circle cx="57" cy="46" r="6" fill="none" stroke={accent} strokeWidth="2" />
          <path d="M49 46 L 51 46" stroke={accent} strokeWidth="2" />
        </>
      )}
      {accessory === "tie" && <path d="M31 38 C 30 20, 70 18, 69 36 C 62 28, 46 30, 31 38 Z" fill="#3a2a1d" />}
      {accessory === "scarf" && <path d="M31 42 C 30 22, 70 22, 69 42 C 62 32, 40 32, 31 42 Z" fill="#7a4a2a" />}
      {hood && <path d="M20 70 C 14 20, 86 20, 80 70 L 70 70 C 74 34, 26 34, 30 70 Z" fill="#3b3b3b" />}
      {accessory === "npc" && (
        <>
          {/* default-avatar haircut and a floating "..." */}
          <path d="M31 40 C 31 24, 69 24, 69 40 C 62 33, 38 33, 31 40 Z" fill="#6f6a62" />
          <g fill={INK}>
            <circle cx="74" cy="22" r="1.8" />
            <circle cx="80" cy="22" r="1.8" />
            <circle cx="86" cy="22" r="1.8" />
          </g>
        </>
      )}
    </svg>
  );
}
