"use client";

import { motion, useReducedMotion } from "motion/react";
import { Paper, Tape } from "./paper/Paper";
import { RoughStrip } from "./paper/Rough";
import { stanceColor } from "./paper/Stamp";
import { backOut, stepT } from "@/lib/motion";
import { STANCE_LABEL, STANCES, type Analog, type PhaseResult } from "@/lib/types";

function formatDate(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function HistoryDrawer({ analogs, phase }: { analogs: Analog[]; phase?: PhaseResult }) {
  const reduced = useReducedMotion() ?? false;
  return (
    <section aria-labelledby="history-title">
      <h2 id="history-title" className="mb-4 inline-block bg-[var(--newsprint)] px-3 pb-1 pt-2 font-serif text-2xl font-black italic leading-none" style={{ rotate: "1.5deg", filter: "var(--shadow-1)" }}>
        From the archive
      </h2>

      {analogs.length === 0 && <p className="py-8 font-hand text-xl">digging through old papers…</p>}
      {analogs.some((a) => a.estimated) && (
        <p className="-mt-1 mb-4 font-hand text-lg leading-tight">the closest of 300+ real events since 2000. how people reacted to them isn&apos;t measured yet.</p>
      )}

      <ol className="space-y-5">
        {analogs.map((a, i) => (
          <motion.li
            key={a.id}
            initial={reduced ? false : { x: 80, opacity: 0, rotate: 6 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            transition={stepT(0.45, i * 0.08, backOut, reduced)}
            className="relative"
          >
            {i === 0 && <Tape className="-top-2 right-4" rotate={8} />}
            <Paper seed={`clip-${a.id}`} color="var(--newsprint)" depth={2} jag={4} className="px-4 pb-3 pt-4">
              <div className="flex items-center justify-between border-b border-ink/40 pb-1 font-serif text-[0.7rem] uppercase tracking-widest text-ink-soft">
                <time dateTime={a.date}>{formatDate(a.date)}</time>
                <span title={a.why ? "Similarity judged by the AI" : "Keyword similarity"}>match {Math.round(a.similarity * 100)}%</span>
              </div>
              <h3 className="mt-2 font-serif text-lg font-bold leading-tight">{a.title}</h3>
              {a.why && <p className="mt-1 font-hand text-lg leading-tight text-[var(--st-condemn)]">↳ {a.why}</p>}
              <p className="mt-1 line-clamp-3 font-serif text-sm leading-snug text-ink-soft">{a.summary}</p>
              {!a.estimated && (
                <div className="mt-2">
                  <RoughStrip split={a.stance} height={16} seed={`analog-${a.id}`} label={`Real day-1 reaction to ${a.title}`} />
                </div>
              )}
              <a href={a.url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-serif text-sm italic underline underline-offset-2">
                read the clipping →
              </a>
            </Paper>
          </motion.li>
        ))}
      </ol>

      {phase && phase.weight > 0 && (
        <div className="relative mt-8">
          <Paper seed="delta-card" color="var(--cream)" depth={2} className="px-4 pb-4 pt-5">
            <h3 className="font-display text-base leading-tight">Sim vs. history</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Where the simulated crowd disagrees with real past reactions. History weight {Math.round(phase.weight * 100)}%.
            </p>
            <ul className="mt-3 space-y-1.5">
              {STANCES.map((s) => {
                const d = phase.sim_vs_history_delta[s];
                const pct = Math.round(d * 100);
                return (
                  <li key={s} className="grid grid-cols-[5.5rem_1fr_2.8rem] items-center gap-2 text-sm">
                    <span>{STANCE_LABEL[s]}</span>
                    <span className="relative h-3 border-x border-ink/50" aria-hidden>
                      <span className="absolute inset-y-0 left-1/2 w-px bg-ink/50" />
                      <span
                        className="absolute inset-y-0.5"
                        style={{
                          background: stanceColor(s),
                          left: d < 0 ? `${50 + Math.max(-50, pct * 2.5)}%` : "50%",
                          width: `${Math.min(50, Math.abs(pct) * 2.5)}%`,
                        }}
                      />
                    </span>
                    <span className="text-right font-display text-xs">
                      {pct > 0 ? "+" : ""}
                      {pct}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 font-hand text-lg leading-tight">+ = sim leans that way more than history did</p>
          </Paper>
        </div>
      )}
    </section>
  );
}
