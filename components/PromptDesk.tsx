"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { motion, useReducedMotion } from "motion/react";
import { Paper, Tape } from "./paper/Paper";
import { backOut, stepT } from "@/lib/motion";
import { PHASE_LABEL, PHASES, PLATFORM_LABEL, PLATFORMS, type Phase, type Platform, type SimRequest } from "@/lib/types";

const EXAMPLES = [
  { tag: "war", text: "Country X invades its neighbour at dawn", color: "var(--note-pink)" },
  { tag: "scandal", text: "Major social app caught selling private DMs to advertisers", color: "var(--note-yellow)" },
  { tag: "launch", text: "Apple bans sideloading worldwide", color: "var(--note-blue)" },
  { tag: "crash", text: "Stock market drops 12% in a single day", color: "var(--note-green)" },
  { tag: "election", text: "Outsider candidate wins the presidency by 0.3%", color: "var(--note-lilac)" },
  { tag: "disaster", text: "7.8 earthquake hits a coastal megacity", color: "var(--note-orange)" },
];

type Req = Pick<SimRequest, "text"> & Partial<SimRequest>;

export function PromptDesk({ onSubmit }: { onSubmit: (req: Req) => void }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState("");
  const [horizon, setHorizon] = useState<Phase>("week1");
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [tearing, setTearing] = useState(false);
  const card = useRef<HTMLFormElement>(null);
  const reduced = useReducedMotion() ?? false;

  function submit(e: { preventDefault(): void }) {
    e.preventDefault();
    const t = text.trim();
    if (t.length < 3 || tearing) return;
    const req: Req = { text: t, horizon, platforms, ...(region.trim() ? { region: region.trim() } : {}) };
    if (reduced || !card.current) return onSubmit(req);
    setTearing(true);
    // Tear the card off the page: a jolt, then it falls away on 10fps steps.
    gsap
      .timeline({ onComplete: () => onSubmit(req) })
      .to(card.current, { rotation: -4, y: -14, duration: 0.2, ease: "steps(2)" })
      .to(card.current, { rotation: 22, x: "35vw", y: "110vh", duration: 0.8, ease: "steps(8)" });
  }

  const togglePlatform = (p: Platform) =>
    setPlatforms((cur) => (cur.includes(p) ? (cur.length > 1 ? cur.filter((x) => x !== p) : cur) : [...cur, p]));

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-24 pt-6 sm:pt-12">
      <form ref={card} onSubmit={submit} className="relative w-full">
        <Tape className="-top-3 left-1/2 -translate-x-1/2" rotate={-3} />
        <Tape className="-bottom-2 -right-4 hidden sm:block" rotate={38} />
        <Paper seed="prompt-desk" depth={3} tilt={-1.2} jag={7} className="px-6 pb-7 pt-9 sm:px-10 sm:pb-9 sm:pt-11">
          <label htmlFor="event" className="block font-display text-4xl leading-none sm:text-6xl">
            What just happened?
          </label>
          <p className="mt-3 font-hand text-xl text-ink-soft sm:text-2xl">
            Type any event. We&apos;ll simulate how the internet loses its mind.
          </p>
          <textarea
            id="event"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            rows={3}
            maxLength={400}
            placeholder="e.g. Fed cuts rates by 1% in an emergency meeting"
            className="mt-5 w-full resize-none border-0 border-b-2 border-dashed border-ink/40 bg-transparent px-1 py-2 text-lg leading-relaxed placeholder:text-ink-soft/60 focus:border-ink focus:outline-none sm:text-xl"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="font-hand text-xl underline decoration-wavy decoration-ink/40 underline-offset-4"
            >
              {open ? "fewer knobs" : "more knobs…"}
            </button>
            <button type="submit" className="ink-btn text-lg" disabled={text.trim().length < 3 || tearing}>
              Tear it off →
            </button>
          </div>

          {open && (
            <motion.fieldset
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stepT(0.3, 0, backOut, reduced)}
              className="mt-5 grid gap-4 border-t-2 border-dotted border-ink/30 pt-4 text-sm sm:grid-cols-2"
            >
              <legend className="sr-only">Simulation settings</legend>
              <label className="flex flex-col gap-1">
                <span className="font-display text-xs uppercase tracking-wider">Region focus</span>
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Global"
                  className="border-b-2 border-ink/40 bg-transparent px-1 py-1 focus:border-ink focus:outline-none"
                />
              </label>
              <div className="flex flex-col gap-1">
                <span className="font-display text-xs uppercase tracking-wider">Time horizon</span>
                <div className="flex gap-2">
                  {PHASES.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setHorizon(p)}
                      aria-pressed={horizon === p}
                      className={`border-2 border-ink px-2 py-0.5 ${horizon === p ? "bg-ink text-cream" : ""}`}
                    >
                      {PHASE_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="font-display text-xs uppercase tracking-wider">Platforms</span>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => togglePlatform(p)}
                      aria-pressed={platforms.includes(p)}
                      className={`border-2 border-ink px-2 py-0.5 ${platforms.includes(p) ? "bg-ink text-cream" : "opacity-60"}`}
                    >
                      {PLATFORM_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
            </motion.fieldset>
          )}
        </Paper>
      </form>

      <ul className="mt-12 flex flex-wrap justify-center gap-x-4 gap-y-5" aria-label="Example events">
        {EXAMPLES.map((ex, i) => (
          <motion.li
            key={ex.tag}
            initial={reduced ? false : { y: -30, opacity: 0, rotate: -6 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={stepT(0.4, 0.3 + i * 0.075, backOut, reduced)}
          >
            <motion.button
              type="button"
              onClick={() => setText(ex.text)}
              whileHover={reduced ? undefined : { y: -4, rotate: -2 }}
              transition={stepT(0.2, 0, backOut, reduced)}
              title={ex.text}
              className="block"
            >
              <Paper seed={`chip-${ex.tag}`} color={ex.color} depth={2} jag={3} className="px-4 py-2">
                <span className="font-display text-sm uppercase tracking-wide">{ex.tag}</span>
              </Paper>
            </motion.button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
