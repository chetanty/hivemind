"use client";

import { motion, useReducedMotion } from "motion/react";
import { Paper, Tape } from "./paper/Paper";
import { RoughDrift, RoughStrip } from "./paper/Rough";
import { stanceColor } from "./paper/Stamp";
import { stepT } from "@/lib/motion";
import { PHASE_LABEL, PHASES, PLATFORM_LABEL, PLATFORMS, STANCE_LABEL, STANCES, type Phase } from "@/lib/types";
import type { SimState } from "@/hooks/useSimulation";

export function CrowdMeter({ state, phase, onPhase }: { state: SimState; phase: Phase; onPhase: (p: Phase) => void }) {
  const reduced = useReducedMotion() ?? false;
  const done = state.phases[phase];
  const live = state.live[phase];
  const snap = done ?? live?.snapshot;
  const drift = PHASES.filter((p) => state.phases[p]);

  return (
    <section aria-labelledby="crowd-title" className="relative">
      <Tape className="-top-3 left-6" rotate={-6} />
      <Paper seed="crowd-meter" depth={3} jag={5} className="px-5 pb-6 pt-7">
        <h2 id="crowd-title" className="font-display text-2xl leading-none">
          Crowd meter
        </h2>

        <div role="tablist" aria-label="Time phase" className="mt-4 flex gap-1">
          {PHASES.map((p) => {
            const ready = !!state.phases[p] || !!state.live[p];
            return (
              <button
                key={p}
                role="tab"
                aria-selected={p === phase}
                disabled={!ready}
                onClick={() => onPhase(p)}
                className={`relative -mb-px border-2 border-b-0 border-ink px-2.5 pb-1 pt-1.5 font-display text-xs uppercase tracking-wide transition-transform duration-100 [transition-timing-function:steps(2)] disabled:opacity-35 ${
                  p === phase ? "translate-y-0 bg-[var(--note-yellow)]" : "translate-y-1 bg-[var(--newsprint)]"
                }`}
              >
                {PHASE_LABEL[p]}
                {state.currentPhase === p && !state.phases[p] && <span className="wiggle ml-1 inline-block">✂</span>}
              </button>
            );
          })}
        </div>

        <div className="border-2 border-ink bg-[var(--cream)] p-3">
          {!snap ? (
            <p className="py-10 text-center font-hand text-xl text-ink-soft">sharpening scissors…</p>
          ) : (
            <motion.div
              key={phase}
              initial={reduced ? false : { clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={stepT(0.7, 0, undefined, reduced)}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-display text-sm uppercase">Everyone</span>
                <span className="text-[0.7rem] text-ink-soft">
                  {done ? (done.weight > 0 ? "calibrated vs history" : "simulated") : `step ${live?.index}/${live?.total}`}
                </span>
              </div>
              <RoughStrip split={snap.stance} height={34} seed={`all-${phase}`} label="All platforms" />

              <ul className="mt-3 space-y-1.5">
                {PLATFORMS.filter((p) => snap.by_platform[p]).map((p, i) => (
                  <motion.li
                    key={p}
                    initial={reduced ? false : { clipPath: "inset(0 100% 0 0)" }}
                    animate={{ clipPath: "inset(0 0% 0 0)" }}
                    transition={stepT(0.5, 0.1 + i * 0.08, undefined, reduced)}
                    className="grid grid-cols-[4.6rem_1fr] items-center gap-2"
                  >
                    <span className="truncate text-xs">{PLATFORM_LABEL[p].replace(" comments", "")}</span>
                    <RoughStrip split={snap.by_platform[p]!} height={20} seed={`${p}-${phase}`} label={PLATFORM_LABEL[p]} />
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>

        {snap && (
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 text-sm" aria-label="Legend">
            {STANCES.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span aria-hidden className="inline-block h-3 w-3 border border-ink" style={{ background: stanceColor(s) }} />
                <span>{STANCE_LABEL[s]}</span>
                <span className="ml-auto font-display">{Math.round(snap.stance[s] * 100)}%</span>
              </li>
            ))}
          </ul>
        )}

        {drift.length > 1 && (
          <div className="mt-5 border-t-2 border-dotted border-ink/30 pt-3">
            <h3 className="font-hand text-xl leading-none">how it drifts</h3>
            <RoughDrift seed="drift" series={drift.map((p) => state.phases[p]!.stance)} labels={drift.map((p) => PHASE_LABEL[p])} />
          </div>
        )}
      </Paper>
    </section>
  );
}
