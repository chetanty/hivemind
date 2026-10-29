"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CharacterRow } from "./CharacterRow";
import { CrowdMeter } from "./CrowdMeter";
import { HistoryDrawer } from "./HistoryDrawer";
import { NarrativeWall } from "./NarrativeWall";
import { Paper, Tape } from "./paper/Paper";
import { backOut, stepT } from "@/lib/motion";
import { CATEGORY_LABEL, PHASE_LABEL, PHASES, type CharacterCard, type Phase } from "@/lib/types";
import type { SimState } from "@/hooks/useSimulation";

export function ResultsBoard({
  state,
  characters,
  onNew,
  onReroll,
}: {
  state: SimState;
  characters: CharacterCard[];
  onNew: () => void;
  onReroll: (id: string) => Promise<void>;
}) {
  const reduced = useReducedMotion() ?? false;
  const [picked, setPicked] = useState<Phase | null>(null);
  // Follow the live phase until the user picks a tab.
  const phase: Phase = picked ?? state.currentPhase ?? "hour1";
  useEffect(() => setPicked(null), [state.request?.text]);

  const shown = state.phases[phase] ?? state.live[phase]?.snapshot;
  const latestDone = [...PHASES].reverse().find((p) => state.phases[p]);
  const ev = state.event;
  const progress =
    state.status !== "running"
      ? null
      : !ev
        ? "reading the event…"
        : state.currentPhase && !state.phases[state.currentPhase]
          ? `simulating the crowd: ${PHASE_LABEL[state.currentPhase]}…`
          : Object.keys(state.characters).length < characters.length && state.phases.day1 && !state.live.week1
            ? "the regulars are typing…"
            : "simulating the crowd…";

  return (
    <motion.main
      initial={reduced ? false : { x: "100%", rotate: 3 }}
      animate={{ x: 0, rotate: 0 }}
      transition={stepT(0.8, 0, backOut, reduced)}
      className="mx-auto w-full max-w-[1500px] px-4 pb-20 sm:px-6"
    >
      {/* event strip */}
      <div className="relative mb-10">
        <Tape className="-left-2 -top-2" rotate={-20} />
        <Paper seed={`strip-${state.request?.text}`} depth={2} tilt={-0.6} edges={{ top: false, bottom: true, left: false, right: true }} className="px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-hand text-xl leading-none text-ink-soft">what happened</p>
              <h1 className="mt-1 break-words font-display text-2xl leading-tight sm:text-3xl">{state.request?.text}</h1>
              {ev && (
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  <li className="border-2 border-ink px-2 py-0.5 font-display uppercase">{CATEGORY_LABEL[ev.category]}</li>
                  <li className="border-2 border-ink px-2 py-0.5">
                    severity{" "}
                    <span aria-label={`${ev.severity} of 5`}>
                      {"●".repeat(ev.severity)}
                      <span className="opacity-30">{"●".repeat(5 - ev.severity)}</span>
                    </span>
                  </li>
                  <li className="border-2 border-ink px-2 py-0.5">{ev.region}</li>
                  {ev.actors.length > 0 && <li className="border-2 border-ink px-2 py-0.5">actors: {ev.actors.join(", ")}</li>}
                </ul>
              )}
            </div>
            <div className="flex flex-row-reverse items-center justify-between gap-3 sm:flex-col sm:items-end">
              <span className="stamp text-base text-[var(--st-condemn)]" style={{ rotate: "6deg" }}>
                Simulation
              </span>
              <button type="button" onClick={onNew} className="ink-btn text-sm">
                ← new event
              </button>
            </div>
          </div>
          {(progress || state.meta) && (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 font-hand text-lg leading-tight" aria-live="polite">
              {progress && (
                <span>
                  <span className="wiggle mr-1 inline-block">✂</span>
                  {progress}
                </span>
              )}
              {state.meta && (
                <span className="text-ink-soft">
                  engine: {state.meta.engine === "local" ? `local model (${state.meta.model})` : "template mock"}
                </span>
              )}
            </p>
          )}
          {state.meta?.notice && (
            <p role="status" className="mt-2 border-2 border-dashed border-[var(--st-condemn)] px-3 py-2 text-sm">
              {state.meta.notice}
            </p>
          )}
          {state.status === "error" && (
            <p role="alert" className="mt-3 font-display text-sm text-[var(--st-condemn)]">
              Torn: {state.error}
            </p>
          )}
        </Paper>
      </div>

      <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)_300px]">
        <CrowdMeter state={state} phase={phase} onPhase={setPicked} />
        <NarrativeWall narratives={shown?.narratives ?? []} loading={state.status === "running"} />
        <div className="lg:col-span-2 xl:col-span-1">
          <HistoryDrawer analogs={state.analogs} phase={latestDone ? state.phases[latestDone] : undefined} />
        </div>
      </div>

      <CharacterRow cards={characters} reactions={state.characters} waiting={state.status === "running"} onReroll={onReroll} />
    </motion.main>
  );
}
