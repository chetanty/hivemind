"use client";

import { useCallback, useReducer, useRef } from "react";
import { readSSE } from "@/lib/sse";
import type {
  Analog,
  BatchUpdate,
  CharacterReaction,
  CrowdSnapshot,
  EngineMeta,
  ParsedEvent,
  Phase,
  PhaseResult,
  SimEvent,
  SimRequest,
} from "@/lib/types";

export interface SimState {
  status: "idle" | "running" | "done" | "error";
  request?: Partial<SimRequest> & { text: string };
  event?: ParsedEvent;
  analogs: Analog[];
  phases: Partial<Record<Phase, PhaseResult>>;
  live: Partial<Record<Phase, { snapshot: CrowdSnapshot; index: number; total: number }>>;
  currentPhase?: Phase;
  meta?: EngineMeta;
  characters: Record<string, CharacterReaction>;
  error?: string;
}

const initial: SimState = { status: "idle", analogs: [], phases: {}, live: {}, characters: {} };

type Action =
  | { type: "start"; request: SimState["request"] }
  | { type: "reset" }
  | { type: "reaction"; reaction: CharacterReaction }
  | { type: "fail"; message: string }
  | SimEvent;

function reducer(state: SimState, a: Action): SimState {
  switch (a.type) {
    case "start":
      return { ...initial, status: "running", request: a.request };
    case "reset":
      return initial;
    case "fail":
      return { ...state, status: "error", error: a.message };
    case "reaction":
      return { ...state, characters: { ...state.characters, [a.reaction.id]: a.reaction } };
    case "meta":
      return { ...state, meta: a.data };
    case "parsed":
      return { ...state, event: a.data };
    case "analogs":
      return { ...state, analogs: a.data };
    case "batch": {
      const b: BatchUpdate = a.data;
      return { ...state, currentPhase: b.phase, live: { ...state.live, [b.phase]: { snapshot: b.running, index: b.index, total: b.total } } };
    }
    case "phase_done":
      return { ...state, phases: { ...state.phases, [a.data.phase]: a.data } };
    case "character":
      return { ...state, characters: { ...state.characters, [a.data.id]: a.data } };
    case "done":
      return { ...state, status: "done" };
    case "error":
      return { ...state, status: "error", error: a.data.message };
  }
}

export function useSimulation() {
  const [state, dispatch] = useReducer(reducer, initial);
  const abort = useRef<AbortController | null>(null);

  const run = useCallback(async (request: SimState["request"] & object) => {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    dispatch({ type: "start", request });
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: ctl.signal,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }
      for await (const ev of readSSE(res)) dispatch(ev);
    } catch (err) {
      if (ctl.signal.aborted) return;
      dispatch({ type: "fail", message: err instanceof Error ? err.message : "Something tore." });
    }
  }, []);

  const reset = useCallback(() => {
    abort.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  const reroll = useCallback(
    async (id: string) => {
      if (!state.event) return;
      const crowd = state.phases.day1 ?? Object.values(state.phases)[0];
      const res = await fetch(`/api/characters/${id}/reroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: state.event, crowd: crowd?.stance, narratives: crowd?.narratives.map((n) => ({ name: n.name })) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Re-roll failed");
      dispatch({ type: "reaction", reaction: await res.json() });
    },
    [state.event, state.phases],
  );

  return { state, run, reset, reroll };
}
