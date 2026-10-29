"use client";

import { useEffect, useState } from "react";
import { PromptDesk } from "@/components/PromptDesk";
import { ResultsBoard } from "@/components/ResultsBoard";
import { CutLetters } from "@/components/paper/CutLetters";
import { HiveLogo } from "@/components/paper/HiveLogo";
import { useSimulation } from "@/hooks/useSimulation";
import { DEFAULT_CHARACTERS } from "@/lib/characters/defaults";
import type { CharacterCard } from "@/lib/types";

export default function Home() {
  const { state, run, reset, reroll } = useSimulation();
  const [characters, setCharacters] = useState<CharacterCard[]>(DEFAULT_CHARACTERS);
  const onBoard = state.status !== "idle";

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((d) => d.characters && setCharacters(d.characters))
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <button type="button" onClick={reset} aria-label="Hivemind, back to the desk" className="flex items-center gap-3 text-2xl sm:text-3xl">
          <HiveLogo size={60} className="-rotate-6 shrink-0" />
          <CutLetters text="HIVEMIND" />
        </button>
        <p className="hidden max-w-xs text-right font-hand text-lg leading-tight sm:block">
          a crowd simulator. nothing here was said by a real person.
        </p>
      </header>

      <div className="flex-1">{onBoard ? <ResultsBoard state={state} characters={characters} onNew={reset} onReroll={reroll} /> : <PromptDesk onSubmit={run} />}</div>

      <footer className="px-4 pb-6 text-center text-xs text-ink sm:px-8">
        All posts and reactions are simulated. Characters are fictional archetypes.
        <span className="mt-1 block font-hand text-base">© 2026 Chetan Tyagi</span>
      </footer>
    </div>
  );
}
