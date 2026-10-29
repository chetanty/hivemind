import { seeded } from "@/lib/rng";

const PAPERS = ["var(--cream)", "var(--note-yellow)", "var(--ink)", "var(--note-pink)", "var(--newsprint)", "var(--st-condemn)", "var(--note-blue)"];

/** Ransom-note title: each letter on its own scrap. */
export function CutLetters({ text, className = "" }: { text: string; className?: string }) {
  const r = seeded(text);
  return (
    <span className={`inline-flex flex-wrap gap-[3px] ${className}`} aria-label={text} role="img">
      {[...text].map((ch, i) => {
        const bg = PAPERS[Math.floor(r() * PAPERS.length)];
        const dark = bg === "var(--ink)" || bg === "var(--st-condemn)";
        const serif = r() < 0.4;
        return ch === " " ? (
          <span key={i} className="w-3" />
        ) : (
          <span
            key={i}
            aria-hidden
            className="inline-block px-[0.2em] pt-[0.1em] leading-[1.05]"
            style={{
              background: bg,
              color: dark ? "var(--cream)" : "var(--ink)",
              rotate: `${(r() * 2 - 1) * 6}deg`,
              translate: `0 ${(r() * 2 - 1) * 3}px`,
              fontFamily: serif ? "Georgia, serif" : "var(--font-bowlby)",
              fontWeight: serif ? 900 : 400,
              filter: "var(--shadow-1)",
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}
