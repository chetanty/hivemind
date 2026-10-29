// Local-model engine, tuned for very small models (0.6B–4B) on a laptop GPU.
// Per phase: ONE call that fills five fixed stance slots (narrative + share + 2 posts).
// Per-platform splits are derived from the overall split with platform-culture priors,
// instead of asking a tiny model for 30 numbers it would mostly guess.
// Characters run in parallel (llama-server serves several slots at once).
import { z } from "zod";
import { calibrate, normalize, topStance } from "../aggregate";
// Recent reactions are stored for consistency but kept out of the prompt: tiny models copy them verbatim.
import { recordReaction } from "../characters/store";
import { generateJSON, getProvider } from "../llm";
import { rerankAnalogs, searchAnalogs } from "../analogs/search";
import { parseEventMock } from "../mock/simulate";
import { PLATFORM_SKEW } from "../mock/data";
import { moderate } from "../moderation";
import {
  CATEGORIES,
  PHASES,
  PLATFORMS,
  STANCES,
  STANCE_LABEL,
  type CharacterCard,
  type CharacterReaction,
  type CrowdSnapshot,
  type Narrative,
  type ParsedEvent,
  type Phase,
  type PhaseResult,
  type Platform,
  type SimEvent,
  type SimRequest,
  type Stance,
  type StanceSplit,
} from "../types";

// ---------- prompts ----------

const PHASE_CUE: Record<Phase, string> = {
  hour1: "1 HOUR after the news broke: shock, confusion, first reactions, facts still unclear.",
  day1: "1 DAY after: hot takes and counter-takes, people arguing, narratives forming.",
  week1: "1 WEEK after: fatigue, entrenched camps, more conspiracy theories, many have moved on.",
};

const SLOT_GUIDE: Record<Stance, string> = {
  condemn: "people angry at it, scared of it, or blaming someone",
  support: "people who welcome it, defend it, or rally to help",
  indifferent: "people who don't care, are tired of the news, or only care how it affects them personally",
  conspiracy: "people who think there is a hidden motive or cover-up",
  humor: "people making jokes and memes about it",
};

const SYSTEM_CROWD = `You simulate how people online react to news. Real crowds are split, emotional, funny and cynical.
Rules for posts:
- Each post is a reaction or opinion, NOT a restatement of the headline.
- Never start a post with the event headline. No hashtags.
- Each post sounds different: different words, different person.
- Short: 1-2 sentences, like a real social media post.
Reply with JSON only.`;

const pct = (n: number) => `${Math.round(n * 100)}%`;

// ---------- schemas ----------

const Post = z.object({
  platform: z.enum(PLATFORMS),
  text: z.string().min(2).max(300),
});
const Slot = z.object({
  name: z.string().min(2).max(60),
  share: z.coerce.number().min(0).max(100),
  posts: z.array(Post).min(1).max(2),
});
const PhaseSchema = z.object(Object.fromEntries(STANCES.map((s) => [s, Slot])) as Record<Stance, typeof Slot>);

const ParseSchema = z.object({
  category: z.enum(CATEGORIES),
  actors: z.array(z.string().max(40)).max(4),
  region: z.string().max(60),
  severity: z.coerce.number().int().min(1).max(5),
});

const ReactionSchema = z.object({
  post: z.string().min(2).max(400),
  stance: z.enum(STANCES),
  intensity: z.coerce.number().min(0).max(1),
  reasoning: z.string().max(200),
});

// ---------- helpers ----------

/** Fix mojibake from split multi-byte tokens (e.g. "It�s" -> "It's") and tidy whitespace. */
function clean(text: string): string {
  return text
    .replace(/(\w)�(\w)/g, "$1'$2")
    .replace(/�/g, "")
    .replace(/\s*#\w+/g, "")
    .replace(/["”']?\s*[}\]]+[\s\S]*$/, "") // JSON debris after the text
    .replace(/[぀-ヿ㐀-鿿가-힯]+/g, " ") // stray CJK from multilingual models
    .replace(/\s+/g, " ")
    .trim();
}

const same = (a: string, b: string) => {
  const n = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z ]/g, "")
      .trim();
  return n(a).slice(0, 30) === n(b).slice(0, 30);
};

/** Drop posts that just parrot the headline or repeat an earlier post. */
function usable(text: string, headline: string, seen: string[]): boolean {
  if (text.length < 8 || same(text, headline)) return false;
  return !seen.some((s) => same(s, text));
}

// ---------- guards for tiny-model slips ----------

const FALLBACK_NAME: Record<Stance, string> = {
  condemn: "Anger and blame",
  support: "Rallying behind it",
  indifferent: "Shrugging it off",
  conspiracy: "What they're not saying",
  humor: "Meme mode",
};

const words = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9]+/g) ?? []);

/** Narrative names that just echo the headline (or each other) get a clean stance label instead. */
function narrativeName(raw: string, stance: Stance, headline: string, taken: Set<string>): string {
  const name = clean(raw)
    .replace(/_/g, " ")
    .replace(/[,;:.\s]+$/, "");
  const w = [...words(name)];
  const head = words(headline);
  const echoesHeadline = w.length > 0 && w.filter((x) => head.has(x)).length / w.length >= 0.6;
  const key = name.toLowerCase();
  if (name.length < 3 || echoesHeadline || taken.has(key)) return FALLBACK_NAME[stance];
  taken.add(key);
  return name;
}

const EMOJI = /\p{Extended_Pictographic}️?/gu;
function oneEmoji(t: string): string {
  let seen = 0;
  return t
    .replace(EMOJI, (m) => (++seen > 1 ? "" : m))
    .replace(/\s+/g, " ")
    .trim();
}
// Length budget per voice, in characters. Whole sentences are kept until the budget runs out.
const MAX_CHARS = { short: 140, medium: 280, long: 500 } as const;
const looksGerman = (t: string) => (t.match(/\b(ich|und|nicht|die|das|ist|mit|ein|eine|doch|aber)\b/gi) ?? []).length >= 3;

/** Enforce what the prompt asked for but a small model ignores: length, emoji, no narration/markup. */
function shapePost(text: string, card: CharacterCard): string {
  let t = clean(text)
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^["“]|["”]$/g, "")
    .replace(/\(?\b(sometimes adds|uses lots of|never uses) (one )?emoji\.?\)?/gi, "");
  // Drop a leading third-person narration sentence ("Marcus leaned into his terminal.")
  t = t.replace(new RegExp(`^${card.name}\\b[^.!?]*[.!?]\\s*`, "i"), "");
  // Shield decimals ("0.3%") from the sentence splitter.
  const shielded = t.replace(/(\d)\.(\d)/g, "$1․$2");
  const sentences = shielded.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) ?? [shielded];
  const budget = MAX_CHARS[card.voice.typical_length];
  let kept = "";
  for (const s of sentences) {
    const next = `${kept} ${s.trim()}`.trim();
    // Always keep a meaningful opening: a 1-3 word first "sentence" ("100bps?") pulls in the next one.
    if (kept && next.length > budget && kept.length >= 25) break;
    kept = next;
  }
  t = kept.replace(/․/g, ".");
  if (card.voice.emoji_use === "none") t = t.replace(EMOJI, "");
  if (card.voice.emoji_use === "light") t = oneEmoji(t);
  return t.replace(/\s+/g, " ").trim();
}

// ---------- steps ----------

async function parseEvent(req: SimRequest, signal?: AbortSignal): Promise<ParsedEvent> {
  const fallback = parseEventMock(req);
  try {
    const out = await generateJSON(ParseSchema, {
      signal,
      temperature: 0.1,
      maxTokens: 120,
      system: "You classify news events. Reply with JSON only.",
      prompt: `Event: "${req.text}"
category: one of ${CATEGORIES.join(", ")}
actors: people, countries, companies or institutions named in the event (e.g. "Fed", "Apple")
region: where it matters most, e.g. "United States", "Europe", "Global"
severity 1-5: 1 = minor gossip, 3 = big national news, 4 = major shock (emergency rate cut, big scandal), 5 = historic (war, catastrophe)`,
    });
    const actors = out.actors.filter(
      (a) => a && a.length <= 30 && a.length < req.text.length * 0.6 && req.text.toLowerCase().includes(a.toLowerCase()),
    );
    return {
      text: req.text,
      category: out.category,
      actors: (actors.length ? actors : fallback.actors).slice(0, 4),
      region: req.region || out.region || fallback.region,
      // Tiny models under-rate severity; keyword heuristics are a floor.
      severity: Math.max(out.severity, fallback.severity),
      novelty: fallback.novelty,
    };
  } catch (err) {
    if (signal?.aborted) throw err;
    return fallback;
  }
}

function previousSummary(prev?: PhaseResult): string {
  if (!prev) return "";
  return `\nEarlier, the main narratives were: ${prev.narratives
    .slice(0, 3)
    .map((n) => `"${n.name}" (${pct(n.share)})`)
    .join(", ")}. Let the conversation move on from there, don't repeat it.`;
}

async function simulatePhase(
  ev: ParsedEvent,
  phase: Phase,
  platforms: Platform[],
  prev: PhaseResult | undefined,
  signal?: AbortSignal,
): Promise<CrowdSnapshot> {
  const out = await generateJSON(PhaseSchema, {
    signal,
    temperature: 0.9,
    maxTokens: 700,
    system: SYSTEM_CROWD,
    prompt: `Event: "${ev.text}"
Moment: ${PHASE_CUE[phase]}${previousSummary(prev)}
Platforms to use: ${platforms.join(", ")}.
Fill each slot:
${STANCES.map((s) => `- ${s}: ${SLOT_GUIDE[s]}`).join("\n")}
For each slot give: a short narrative name about THIS event (2-5 words), its share (all five shares add up to 100), and 2 posts from different platforms. Posts are casual, opinionated, and mention concrete details of this event.`,
  });

  const seen: string[] = [];
  const taken = new Set<string>();
  const raw: Partial<StanceSplit> = {};
  const narratives: Narrative[] = [];
  for (const stance of STANCES) {
    const slot = out[stance];
    raw[stance] = slot.share;
    const samples = slot.posts
      .map((p) => ({
        platform: platforms.includes(p.platform) ? p.platform : platforms[narratives.length % platforms.length],
        text: moderate(oneEmoji(clean(p.text))),
      }))
      .filter((p) => {
        const ok = usable(p.text, ev.text, seen);
        if (ok) seen.push(p.text);
        return ok;
      });
    if (samples.length)
      narratives.push({
        name: narrativeName(slot.name, stance, ev.text, taken),
        stance,
        share: 0,
        samples,
      });
  }

  const stance = normalize(raw);
  for (const n of narratives) n.share = stance[n.stance];
  narratives.sort((a, b) => b.share - a.share);

  // Platform splits: overall split shaped by each platform's culture.
  const by_platform: Partial<Record<Platform, StanceSplit>> = {};
  for (const p of platforms) {
    by_platform[p] = normalize(Object.fromEntries(STANCES.map((s) => [s, stance[s] * PLATFORM_SKEW[p][s]])) as StanceSplit);
  }
  return {
    stance,
    by_platform,
    narratives: narratives.filter((n) => n.share >= 0.03),
    n: narratives.length,
  };
}

export async function characterReaction(
  card: CharacterCard,
  ev: ParsedEvent,
  crowd: Pick<CrowdSnapshot, "stance" | "narratives"> | undefined,
  signal?: AbortSignal,
): Promise<CharacterReaction> {
  const crowdLine = crowd
    ? `Online, most people are posting: ${crowd.narratives
        .slice(0, 3)
        .map((n) => `"${n.name}" (${STANCE_LABEL[n.stance].toLowerCase()})`)
        .join(", ")}.`
    : "";
  const relation =
    card.crowd_relation === "follower"
      ? "They usually go along with the crowd."
      : card.crowd_relation === "contrarian"
        ? "They usually push AGAINST whatever the crowd thinks."
        : "They follow their own values, not the crowd.";

  const ask = (extra = "") =>
    generateJSON(
      ReactionSchema,
      {
        signal,
        temperature: 0.9,
        maxTokens: 160,
        system: `You write one social media post as a fictional character, in English, in first person. Output only what they would actually post: no narration, no "${card.name} says", no quotes around it. No slurs. No hashtags. Reply with JSON only.`,
        prompt: `Character: ${card.name}. ${card.bio}
Values: ${card.values.join(", ")}. Gets news from: ${card.media_diet.join(", ")}.
Voice: ${card.voice.tone}. Words they use: ${card.voice.slang}.
Cares a lot about: ${card.triggers.join(", ")}. ${relation}

Event: "${ev.text}"
${crowdLine}

Write ${card.name}'s post reacting to this event, in their voice, with their own opinion (not a restatement of the headline). Keep it short.
stance: condemn, support, indifferent, conspiracy or humor
intensity: 0 (calm) to 1 (furious or thrilled)
reasoning: one short sentence on why they feel this way
Write in English.${extra}`,
      },
      getProvider("characters"),
    );

  let out = await ask();
  if (looksGerman(out.post)) out = await ask(" ENGLISH ONLY, even if the character lives abroad.");
  if (same(out.post, ev.text)) out = await ask(" Do NOT repeat the headline. Say what they THINK about it.");

  const top = crowd ? topStance(crowd.stance) : undefined;
  const reaction: CharacterReaction = {
    id: card.id,
    post: moderate(shapePost(out.post, card)),
    stance: out.stance,
    intensity: Math.round(out.intensity * 100) / 100,
    with_crowd: out.stance === top,
    reasoning: clean(out.reasoning),
  };
  recordReaction(ev.text, reaction);
  return reaction;
}

// ---------- pipeline ----------

export async function* localSimulate(
  req: SimRequest,
  opts: { signal?: AbortSignal; characters: CharacterCard[] },
): AsyncGenerator<SimEvent> {
  const { signal, characters } = opts;
  const provider = getProvider();
  yield { type: "meta", data: { engine: "local", model: provider.model } };

  const event = await parseEvent(req, signal);
  yield { type: "parsed", data: event };

  // Similar past events: keyword search over the library, then (hosted models only) an LLM re-rank by meaning.
  // Their reaction splits are still estimates until measured data lands (M4), so they aren't used for calibration.
  const candidates = searchAnalogs(event, 20);
  const reranker = getProvider("characters");
  const analogs = reranker.name === "llama.cpp" ? candidates.slice(0, 5) : await rerankAnalogs(event, candidates, reranker, 5, signal);
  yield { type: "analogs", data: analogs };

  const platforms = PLATFORMS.filter((p) => req.platforms.includes(p));
  const phases = PHASES.slice(0, PHASES.indexOf(req.horizon) + 1);
  const characterPhase: Phase = phases.includes("day1") ? "day1" : phases[phases.length - 1];
  const results: PhaseResult[] = [];
  const reactions: CharacterReaction[] = [];
  let prev: PhaseResult | undefined;

  for (const phase of phases) {
    let snap: CrowdSnapshot;
    try {
      snap = await simulatePhase(event, phase, platforms, prev, signal);
    } catch (err) {
      if (signal?.aborted) throw err;
      console.error(`phase ${phase} failed, retrying once`, err);
      snap = await simulatePhase(event, phase, platforms, prev, signal);
    }
    yield { type: "batch", data: { phase, index: 1, total: 1, running: snap } };

    const result = calibrate(phase, snap, []);
    results.push(result);
    prev = result;
    yield { type: "phase_done", data: result };

    if (phase === characterPhase) {
      // All five in parallel; yield each as soon as it lands.
      const pending = new Map(
        characters.map((card) => [
          card.id,
          characterReaction(card, event, result, signal).then(
            (r) => ({ id: card.id, r }),
            (err) => ({ id: card.id, err }),
          ),
        ]),
      );
      while (pending.size) {
        const settled = await Promise.race(pending.values());
        pending.delete(settled.id);
        if ("r" in settled) {
          reactions.push(settled.r);
          yield { type: "character", data: settled.r };
        } else {
          if (signal?.aborted) throw settled.err;
          console.error(`character ${settled.id} failed`, settled.err);
        }
      }
    }
  }

  yield {
    type: "done",
    data: { event, analogs, phases: results, characters: reactions },
  };
}
