// M1 mock engine: same event contract as the real engine, but posts come from templates.
import { calibrate, normalize, snapshot, topStance } from "../aggregate";
import { DEFAULT_CHARACTERS } from "../characters/defaults";
import { hashString, mulberry32, pick, weightedPick } from "../rng";
import {
  PHASES,
  STANCES,
  type Analog,
  type CharacterCard,
  type CharacterReaction,
  type ParsedEvent,
  type Phase,
  type PhaseResult,
  type Platform,
  type SimEvent,
  type SimPost,
  type SimRequest,
  type Stance,
  type StanceSplit,
} from "../types";
import { searchAnalogs } from "../analogs/search";
import {
  BASE_STANCE,
  CATEGORY_KEYWORDS,
  CHARACTER_LEANS,
  CHARACTER_POSTS,
  EMOTIONS,
  NARRATIVES,
  PHASE_SHIFT,
  PLATFORM_MIX,
  PLATFORM_SKEW,
  SEVERITY_HINTS,
  SHARED_NARRATIVES,
} from "./data";

const BATCH_SIZE = 20;

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });
}

export function parseEventMock(req: SimRequest): ParsedEvent {
  const text = req.text;
  const category = CATEGORY_KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? "scandal";
  const actors = [...text.matchAll(/\b([A-Z][\w'-]*(?:\s+[A-Z0-9][\w'-]*)*)/g)]
    .map((m) => m[1])
    .filter((a, i) => !(i === 0 && /^(The|A|An|Major|Big|Huge|Massive|New|Local|Former|Famous|Popular|Outsider|Stock|Global|Breaking)$/.test(a)));
  const severity = SEVERITY_HINTS.find(([re]) => re.test(text))?.[1] ?? 2;
  const rand = mulberry32(hashString(text));
  return {
    text,
    category,
    actors: [...new Set(actors)].slice(0, 4),
    region: req.region || "Global",
    severity,
    novelty: Math.round((0.3 + rand() * 0.6) * 100) / 100,
  };
}

function shifted(base: StanceSplit, ...mods: StanceSplit[]): StanceSplit {
  const out = { ...base };
  for (const m of mods) for (const s of STANCES) out[s] *= m[s];
  return normalize(out);
}

export function analogPhaseSplit(a: Analog, phase: Phase): StanceSplit {
  return shifted(a.stance, PHASE_SHIFT[phase]);
}

export function analogsFor(ev: ParsedEvent): Analog[] {
  return searchAnalogs(ev, 5);
}

interface Persona {
  platform: Platform;
  age: string;
  politics: "left" | "center" | "right" | "apolitical";
  online: number;
}

function samplePersonas(n: number, platforms: Platform[], rand: () => number): Persona[] {
  const mix = Object.fromEntries(platforms.map((p) => [p, PLATFORM_MIX[p]])) as Record<Platform, number>;
  return Array.from({ length: n }, () => {
    const platform = weightedPick(rand, mix);
    const young = platform === "tiktok" || platform === "reddit";
    return {
      platform,
      age: young ? pick(rand, ["16-24", "25-34", "25-34"]) : pick(rand, ["25-34", "35-54", "55+"]),
      politics: weightedPick(rand, { left: 0.3, center: 0.25, right: 0.28, apolitical: 0.17 }),
      online: rand(),
    };
  });
}

function fill(template: string, ev: ParsedEvent) {
  return template
    .replaceAll("{A}", ev.actors[0] ?? "they")
    .replaceAll("{B}", ev.actors[1] ?? "everyone else");
}

function platformVoice(text: string, platform: Platform, rand: () => number): string {
  if (platform === "tiktok") return text.toLowerCase().replace(/\.$/, "") + (rand() < 0.5 ? " 😭" : " fr");
  if (platform === "facebook" && rand() < 0.4) return text + " Share if you agree!!";
  if (platform === "reddit" && rand() < 0.25) return text + "\n\nEdit: wow this blew up";
  if (platform === "youtube" && rand() < 0.3) return "Who else is watching this the day it happened? " + text;
  return text;
}

function mockPost(p: Persona, phase: Phase, ev: ParsedEvent, rand: () => number): SimPost {
  const lean: StanceSplit = {
    condemn: p.politics === "left" ? 1.15 : 1,
    support: p.politics === "right" ? 1.15 : 1,
    indifferent: p.politics === "apolitical" ? 1.6 : 1,
    conspiracy: 0.7 + p.online * 0.8,
    humor: 0.8 + p.online * 0.5,
  };
  const dist = shifted(BASE_STANCE[ev.category], PHASE_SHIFT[phase], PLATFORM_SKEW[p.platform], lean);
  const stance = weightedPick(rand, dist);
  const options = NARRATIVES[ev.category].filter((n) => n.stance === stance);
  const shared = stance === "humor" || stance === "indifferent" || stance === "conspiracy" ? SHARED_NARRATIVES[stance] : undefined;
  const narrative =
    options.length && !(shared && rand() < 0.25) ? pick(rand, options) : shared ?? pick(rand, NARRATIVES[ev.category]);
  return {
    platform: p.platform,
    text: platformVoice(fill(pick(rand, narrative.posts), ev), p.platform, rand),
    stance,
    emotion: pick(rand, EMOTIONS[stance]),
    narrative: narrative.name,
    intensity: Math.min(1, Math.round((0.2 + (ev.severity / 5) * 0.5 + rand() * 0.3) * 100) / 100),
  };
}

export function mockCharacterReaction(
  card: CharacterCard,
  ev: ParsedEvent,
  crowd: StanceSplit | undefined,
  rand: () => number = Math.random,
): CharacterReaction {
  const crowdTop = crowd ? topStance(crowd) : undefined;
  let stance: Stance = CHARACTER_LEANS[card.id]?.[ev.category] ?? pick(rand, STANCES);
  if (card.crowd_relation === "follower" && crowdTop && rand() < 0.5) stance = crowdTop;
  if (card.crowd_relation === "contrarian" && stance === crowdTop) stance = pick(rand, STANCES.filter((s) => s !== crowdTop));
  if (rand() < 0.2) stance = pick(rand, STANCES);

  const bank = CHARACTER_POSTS[card.id]?.[stance] ?? card.sample_posts;
  const triggered = card.triggers.some((t) => ev.text.toLowerCase().includes(t.toLowerCase().split(" ")[0]));
  const intensity = Math.min(1, Math.round((0.25 + ev.severity * 0.1 + (triggered ? 0.2 : 0) + rand() * 0.2) * 100) / 100);
  const with_crowd = stance === crowdTop;
  const reasoning = with_crowd
    ? `${card.name}'s ${card.values[0].toLowerCase()} lines up with where the crowd already is.`
    : `${card.name} reads this through ${card.media_diet[0]} and lands somewhere the crowd isn't.`;
  return { id: card.id, post: fill(pick(rand, bank), ev), stance, intensity, with_crowd, reasoning };
}

export async function* mockSimulate(
  req: SimRequest,
  opts: { signal?: AbortSignal; characters?: CharacterCard[] } = {},
): AsyncGenerator<SimEvent> {
  const { signal } = opts;
  const characters = opts.characters ?? DEFAULT_CHARACTERS;
  const rand = mulberry32(hashString(req.text) ^ (Date.now() & 0xffffff));

  await sleep(500, signal);
  const event = parseEventMock(req);
  yield { type: "parsed", data: event };

  await sleep(450, signal);
  const analogs = analogsFor(event);
  yield { type: "analogs", data: analogs };

  const personas = samplePersonas(req.personas, req.platforms, rand);
  const phases = PHASES.slice(0, PHASES.indexOf(req.horizon) + 1);
  const characterPhase: Phase = phases.includes("day1") ? "day1" : phases[phases.length - 1];
  const results: PhaseResult[] = [];
  const reactions: CharacterReaction[] = [];
  const total = Math.ceil(personas.length / BATCH_SIZE);

  for (const phase of phases) {
    const posts: SimPost[] = [];
    for (let i = 0; i < total; i++) {
      await sleep(220 + rand() * 280, signal);
      posts.push(...personas.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE).map((p) => mockPost(p, phase, event, rand)));
      yield { type: "batch", data: { phase, index: i + 1, total, running: snapshot(posts) } };
    }
    const result = calibrate(phase, snapshot(posts), analogs, analogPhaseSplit);
    results.push(result);
    yield { type: "phase_done", data: result };

    if (phase === characterPhase) {
      for (const card of characters) {
        await sleep(250 + rand() * 350, signal);
        const r = mockCharacterReaction(card, event, result.stance, rand);
        reactions.push(r);
        yield { type: "character", data: r };
      }
    }
  }

  yield { type: "done", data: { event, analogs, phases: results, characters: reactions } };
}
