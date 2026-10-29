// Finds past events similar to a new one.
// Stage 1: BM25 keyword ranking over ~300 real events (lib/analogs/events.json, built by scripts/build-analogs.mjs),
//          boosted for the same category. Instant and dependency-free.
// Stage 2 (optional): an LLM re-ranks the top candidates by meaning and explains each match.
import { z } from "zod";
import { generateJSON, type LLMProvider } from "../llm";
import { BASE_STANCE } from "../mock/data";
import { normalize } from "../aggregate";
import { hashString, mulberry32 } from "../rng";
import { CATEGORY_LABEL, STANCES, type Analog, type Category, type ParsedEvent, type StanceSplit } from "../types";
import raw from "./events.json";

export interface LibraryEvent {
  id: string;
  title: string;
  date: string;
  category: Category;
  url: string;
  summary: string;
  notability: number;
}

export const LIBRARY = raw as LibraryEvent[];

// ---------- BM25 ----------

const STOP = new Set(
  "a an the of in on at to for by with from and or but is are was were be been it its this that as after before over into about than who whom which what when where why how all any not no new first last".split(" "),
);

// Words that signal a category even when the event text doesn't name it.
const CATEGORY_HINTS: Record<Category, string> = {
  war: "war invasion military troops attack conflict offensive strikes",
  terror: "terrorist attack shooting bombing gunman victims",
  election: "election vote presidential referendum wins candidate",
  scandal: "scandal leak fraud corruption investigation fined",
  celebrity_death: "death died dies passed away",
  tech_launch: "launch app platform users phone service released",
  economic: "financial crisis market stock bank rates recession",
  disaster: "earthquake hurricane flood disaster tsunami outbreak crash",
};

/** Crude stemmer: drop plural/verb endings, then keep a 6-letter prefix ("advertisers" ~ "advertising"). */
function stem(w: string): string {
  const base = w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w;
  return base.length > 6 ? base.slice(0, 6) : base;
}

const tokenize = (text: string): string[] =>
  (text.toLowerCase().normalize("NFKD").match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

// Title counts double: it's the most specific text we have.
const docs = LIBRARY.map((e) => tokenize(`${e.title} ${e.title} ${e.summary}`));
const avgLen = docs.reduce((s, d) => s + d.length, 0) / docs.length;
const df = new Map<string, number>();
for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1);
const tf = docs.map((d) => {
  const m = new Map<string, number>();
  for (const t of d) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
});
const idf = (t: string) => {
  const n = df.get(t) ?? 0;
  return Math.log(1 + (LIBRARY.length - n + 0.5) / (n + 0.5));
};

function bm25(query: string[], i: number, k1 = 1.4, b = 0.75): number {
  let score = 0;
  const len = docs[i].length;
  for (const t of new Set(query)) {
    const f = tf[i].get(t);
    if (!f) continue;
    score += (idf(t) * f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / avgLen));
  }
  return score;
}

/** Rough 0–1 match score from a BM25 score (saturating). */
const toSimilarity = (score: number) => Math.round((0.3 + 0.6 * (score / (score + 8))) * 100) / 100;

/** Reaction split for an analog. No measured data yet, so it's a category-level estimate (flagged as such). */
function estimatedStance(e: LibraryEvent): StanceSplit {
  const rand = mulberry32(hashString(e.id));
  const base = BASE_STANCE[e.category];
  return normalize(Object.fromEntries(STANCES.map((s) => [s, base[s] * (0.75 + rand() * 0.5)])) as StanceSplit);
}

function toAnalog(e: LibraryEvent, similarity: number, why?: string): Analog {
  return { id: e.id, title: e.title, date: e.date, url: e.url, summary: e.summary, similarity, why, stance: estimatedStance(e), estimated: true };
}

/** Stage 1: keyword ranking. Returns the top `k` candidates, best first. */
export function searchAnalogs(ev: Pick<ParsedEvent, "text" | "category" | "actors" | "region">, k = 5): Analog[] {
  const query = tokenize(`${ev.text} ${ev.actors.join(" ")} ${ev.region === "Global" ? "" : ev.region}`);
  const hints = tokenize(CATEGORY_HINTS[ev.category]);
  const scored = LIBRARY.map((e, i) => {
    let s = bm25(query, i) + 0.35 * bm25(hints, i);
    if (e.category === ev.category) s = s * 1.5 + 4; // same kind of event is the strongest single signal
    s += Math.log10(e.notability) * 0.3; // tie-breaker: widely covered events have richer reaction histories
    return { e, s };
  }).sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map(({ e, s }) => toAnalog(e, toSimilarity(s)));
}

// ---------- stage 2: LLM re-rank ----------

const RerankSchema = z.object({
  matches: z
    .array(
      z.object({
        id: z.string(),
        similarity: z.coerce.number().min(0).max(100),
        why: z.string().max(160),
      }),
    )
    .min(1)
    .max(8),
});

/** Stage 2: let a model pick the closest analogs by meaning. Falls back to the keyword order on any failure. */
export async function rerankAnalogs(ev: ParsedEvent, candidates: Analog[], provider: LLMProvider, k = 5, signal?: AbortSignal): Promise<Analog[]> {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  try {
    const out = await generateJSON(
      RerankSchema,
      {
        signal,
        temperature: 0.2,
        maxTokens: 500,
        system: "You compare news events. Reply with JSON only.",
        prompt: `New event: "${ev.text}" (${CATEGORY_LABEL[ev.category]}, ${ev.region})

Past events:
${candidates.map((c) => `- ${c.id}: ${c.title} (${c.date.slice(0, 4)}). ${c.summary.slice(0, 140)}`).join("\n")}

Pick the ${k} past events whose PUBLIC REACTION would most resemble the reaction to the new event: similar stakes, actors, emotions and controversy, not just similar keywords.
For each: id (from the list), similarity 0-100, why (one short phrase, max 12 words).`,
      },
      provider,
    );
    const picked = out.matches
      .filter((m) => byId.has(m.id))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map((m) => ({ ...byId.get(m.id)!, similarity: Math.round(m.similarity) / 100, why: m.why.trim() }));
    if (picked.length >= Math.min(3, k)) return picked;
  } catch (err) {
    if (signal?.aborted) throw err;
    console.error("analog rerank failed, using keyword order", err);
  }
  return candidates.slice(0, k);
}
