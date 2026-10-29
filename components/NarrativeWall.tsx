"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Paper, Pin } from "./paper/Paper";
import { Stamp, stanceColor } from "./paper/Stamp";
import { backOut, stepT } from "@/lib/motion";
import { PLATFORM_LABEL, type Narrative } from "@/lib/types";

const NOTE_COLORS = ["var(--note-yellow)", "var(--note-pink)", "var(--note-blue)", "var(--note-green)", "var(--note-lilac)", "var(--note-orange)"];

function Scrap({ seed, platform, text }: { seed: string; platform: string; text: string }) {
  return (
    <Paper seed={seed} depth={1} jag={3} boil={false} className="px-3 py-2">
      <span className="font-display text-[0.65rem] uppercase tracking-wider text-ink-soft">{platform}</span>
      <p className="whitespace-pre-line text-[0.85rem] leading-snug">{text}</p>
    </Paper>
  );
}

export function NarrativeWall({ narratives, loading }: { narratives: Narrative[]; loading: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState<string | null>(null);
  const active = narratives.find((n) => n.name === open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section aria-labelledby="wall-title" className="relative">
      <h2 id="wall-title" className="mb-4 inline-block bg-ink px-3 pb-1 pt-2 font-display text-2xl leading-none text-cream" style={{ rotate: "-1.5deg" }}>
        Narrative wall
      </h2>

      {narratives.length === 0 && (
        <p className="py-16 text-center font-hand text-2xl text-ink">{loading ? "pinning up the first takes…" : "nothing pinned yet"}</p>
      )}

      <ul className="grid gap-x-6 gap-y-9 sm:grid-cols-2 2xl:grid-cols-3">
        {narratives.map((n, i) => (
          <motion.li
            key={n.name}
            layout={!reduced}
            initial={reduced ? false : { y: -60, opacity: 0, rotate: i % 2 ? 8 : -8 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={stepT(0.5, i * 0.08, backOut, reduced)}
          >
            <motion.button
              type="button"
              onClick={() => setOpen(n.name)}
              whileHover={reduced ? undefined : { y: -8, scale: 1.02, rotate: 0 }}
              transition={stepT(0.2, 0, backOut, reduced)}
              className="relative block w-full text-left"
              aria-label={`${n.name}, ${Math.round(n.share * 100)} percent. Open details`}
            >
              <Pin className="-top-3 left-1/2 -translate-x-1/2" color={stanceColor(n.stance)} />
              <Paper seed={`note-${n.name}`} color={NOTE_COLORS[i % NOTE_COLORS.length]} depth={2} jag={4} className="px-4 pb-4 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg leading-tight">{n.name}</h3>
                  <span className="font-hand text-4xl leading-none" style={{ color: stanceColor(n.stance) }}>
                    {Math.round(n.share * 100)}%
                  </span>
                </div>
                <Stamp stance={n.stance} className="mt-1 !text-[0.65rem]" rotate={-4} />
                <div className="mt-3 space-y-2">
                  {n.samples.map((s, j) => (
                    <Scrap key={j} seed={`${n.name}-${j}`} platform={PLATFORM_LABEL[s.platform]} text={s.text} />
                  ))}
                </div>
              </Paper>
            </motion.button>
          </motion.li>
        ))}
      </ul>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={stepT(0.2, 0, undefined, reduced)}
            onClick={() => setOpen(null)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={active.name}
              initial={reduced ? false : { scale: 0.6, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.6, rotate: 8, opacity: 0 }}
              transition={stepT(0.35, 0, backOut, reduced)}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <Paper seed={`open-${active.name}`} color="var(--note-yellow)" depth={3} tilt={-1} className="px-6 pb-6 pt-8">
                <button onClick={() => setOpen(null)} autoFocus className="absolute right-0 top-0 font-display text-xl" aria-label="Close">
                  ✕
                </button>
                <p className="font-hand text-2xl" style={{ color: stanceColor(active.stance) }}>
                  {Math.round(active.share * 100)}% of the crowd
                </p>
                <h3 className="font-display text-3xl leading-tight">{active.name}</h3>
                <Stamp stance={active.stance} className="mt-2" />
                <div className="mt-5 space-y-3">
                  {active.samples.map((s, j) => (
                    <Scrap key={j} seed={`open-${active.name}-${j}`} platform={PLATFORM_LABEL[s.platform]} text={s.text} />
                  ))}
                </div>
                <p className="mt-4 text-xs text-ink-soft">Simulated posts. Not written by real people.</p>
              </Paper>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
