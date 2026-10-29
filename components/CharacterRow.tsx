"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Paper } from "./paper/Paper";
import { HEX, RoughMeter } from "./paper/Rough";
import { Stamp } from "./paper/Stamp";
import { Portrait } from "./Portrait";
import { backOut, stepT } from "@/lib/motion";
import type { CharacterCard, CharacterReaction } from "@/lib/types";

function Sticker({ withCrowd }: { withCrowd: boolean }) {
  return (
    <span
      className="absolute -right-3 -top-3 z-10 grid h-[4.4rem] w-[4.4rem] place-items-center rounded-full border-2 border-ink text-center font-display text-[0.6rem] uppercase leading-tight"
      style={{
        background: withCrowd ? "var(--note-green)" : "var(--note-pink)",
        rotate: withCrowd ? "12deg" : "-14deg",
        filter: "var(--shadow-2)",
      }}
    >
      {withCrowd ? (
        <>
          with the
          <br />
          crowd
        </>
      ) : (
        <>
          against
          <br />
          the crowd
        </>
      )}
    </span>
  );
}

function CharacterCardView({
  card,
  reaction,
  index,
  waiting,
  onReroll,
}: {
  card: CharacterCard;
  reaction?: CharacterReaction;
  index: number;
  waiting: boolean;
  onReroll: () => Promise<void>;
}) {
  const reduced = useReducedMotion() ?? false;
  const [busy, setBusy] = useState(false);
  const look = card.look ?? { paper: "#8d8579", skin: "#e2b48f", accent: "#211c17", accessory: "cap" as const };

  return (
    <motion.li
      initial={reduced ? false : { y: 120, rotate: index % 2 ? 6 : -6 }}
      animate={{ y: 0, rotate: 0 }}
      transition={stepT(0.55, 0.15 + index * 0.08, backOut, reduced)}
      className="flex flex-col"
    >
      <AnimatePresence mode="wait">
        {reaction ? (
          <motion.div
            key={reaction.post}
            initial={reduced ? false : { y: 40, scale: 0.7, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={stepT(0.4, 0, backOut, reduced)}
            className="relative mb-3"
          >
            <Paper seed={`bubble-${card.id}-${reaction.post.length}`} depth={2} jag={4} className="px-4 pb-4 pt-4">
              <p className="text-[0.92rem] leading-snug">{reaction.post}</p>
              <p className="mt-2 font-hand text-base leading-tight text-ink-soft">{reaction.reasoning}</p>
            </Paper>
            {/* speech-bubble tail */}
            <svg aria-hidden viewBox="0 0 30 22" className="absolute -bottom-4 left-10 h-5 w-7" style={{ filter: "var(--shadow-1)" }}>
              <path d="M0 0 L30 0 L6 22 Z" fill="var(--cream)" />
            </svg>
          </motion.div>
        ) : (
          <div className="mb-3 flex min-h-24 items-end justify-center pb-2">
            <p className="font-hand text-xl text-ink">{waiting ? "reading the room…" : "…"}</p>
          </div>
        )}
      </AnimatePresence>

      <div className="relative mt-auto">
        {reaction && <Sticker withCrowd={reaction.with_crowd} />}
        <Paper seed={`char-${card.id}`} color={look.paper} depth={3} jag={6} className="px-4 pb-4 pt-3">
          <div className="flex items-end gap-3">
            <Portrait look={look} className="-mt-8 h-24 w-22 shrink-0" />
            <div className="min-w-0 pb-1">
              <h3 className={`font-display leading-none ${card.name.length > 9 ? "text-xl" : "text-2xl"}`} style={{ color: "var(--cream)", textShadow: "2px 2px 0 var(--ink)" }}>
                {card.name}
              </h3>
            </div>
          </div>
          <div className="mt-3 bg-[var(--cream)] px-3 pb-3 pt-2" style={{ clipPath: "polygon(0 3%, 100% 0, 99% 100%, 1% 97%)" }}>
            <p className="text-xs leading-snug">{card.bio}</p>
            {reaction && (
              <div className="mt-3 flex items-center gap-3">
                <Stamp stance={reaction.stance} rotate={-6} className="!text-[0.65rem]" />
                <div className="flex-1">
                  <span className="text-[0.65rem] uppercase tracking-wider text-ink-soft">intensity {Math.round(reaction.intensity * 100)}</span>
                  <RoughMeter value={reaction.intensity} color={HEX[reaction.stance]} seed={`int-${card.id}`} />
                </div>
              </div>
            )}
            {reaction && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onReroll()
                    .catch(() => {})
                    .finally(() => setBusy(false));
                }}
                className="mt-3 font-display text-[0.7rem] uppercase tracking-wider underline decoration-2 underline-offset-2 disabled:opacity-50"
              >
                {busy ? "re-rolling…" : "↻ re-roll"}
              </button>
            )}
          </div>
        </Paper>
      </div>
    </motion.li>
  );
}

export function CharacterRow({
  cards,
  reactions,
  waiting,
  onReroll,
}: {
  cards: CharacterCard[];
  reactions: Record<string, CharacterReaction>;
  waiting: boolean;
  onReroll: (id: string) => Promise<void>;
}) {
  return (
    <section aria-labelledby="chars-title" className="mt-16">
      <h2 id="chars-title" className="mb-6 inline-block bg-[var(--note-yellow)] px-3 pb-1 pt-2 font-display text-2xl leading-none" style={{ rotate: "-1deg", filter: "var(--shadow-1)" }}>
        The usual suspects
      </h2>
      <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <CharacterCardView key={c.id} card={c} reaction={reactions[c.id]} index={i} waiting={waiting} onReroll={() => onReroll(c.id)} />
        ))}
      </ul>
    </section>
  );
}
