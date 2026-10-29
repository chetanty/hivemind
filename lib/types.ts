import { z } from "zod";

export const STANCES = ["condemn", "support", "indifferent", "conspiracy", "humor"] as const;
export const PLATFORMS = ["x", "reddit", "tiktok", "facebook", "youtube", "news"] as const;
export const PHASES = ["hour1", "day1", "week1"] as const;
export const CATEGORIES = [
  "war",
  "terror",
  "election",
  "scandal",
  "celebrity_death",
  "tech_launch",
  "economic",
  "disaster",
] as const;

export type Stance = (typeof STANCES)[number];
export type Platform = (typeof PLATFORMS)[number];
export type Phase = (typeof PHASES)[number];
export type Category = (typeof CATEGORIES)[number];
export type StanceSplit = Record<Stance, number>;

export const PHASE_LABEL: Record<Phase, string> = { hour1: "Hour 1", day1: "Day 1", week1: "Week 1" };
export const PLATFORM_LABEL: Record<Platform, string> = {
  x: "X",
  reddit: "Reddit",
  tiktok: "TikTok",
  facebook: "Facebook",
  youtube: "YouTube",
  news: "News comments",
};
export const STANCE_LABEL: Record<Stance, string> = {
  condemn: "Condemn",
  support: "Support",
  indifferent: "Shrug",
  conspiracy: "Conspiracy",
  humor: "Jokes",
};
export const CATEGORY_LABEL: Record<Category, string> = {
  war: "War / conflict",
  terror: "Terror attack",
  election: "Election result",
  scandal: "Corporate scandal",
  celebrity_death: "Celebrity death",
  tech_launch: "Tech launch",
  economic: "Economic shock",
  disaster: "Natural disaster",
};

// ---- request ----

export const SimRequestSchema = z.object({
  text: z.string().trim().min(3).max(400),
  region: z.string().trim().max(60).optional(),
  horizon: z.enum(PHASES).default("week1"),
  platforms: z.array(z.enum(PLATFORMS)).min(1).default([...PLATFORMS]),
  personas: z.number().int().min(20).max(400).default(120),
});
export type SimRequest = z.infer<typeof SimRequestSchema>;

// ---- simulation output ----

export interface ParsedEvent {
  text: string;
  category: Category;
  actors: string[];
  region: string;
  severity: number; // 1..5
  novelty: number; // 0..1
}

export interface Analog {
  id: string;
  title: string;
  date: string;
  similarity: number;
  url: string;
  summary: string;
  stance: StanceSplit; // reaction split (day 1)
  /** one-line reason this event is a good analog (from the LLM re-rank) */
  why?: string;
  /** true until the M4 analog library supplies real measured splits */
  estimated?: boolean;
}

export interface SimPost {
  platform: Platform;
  text: string;
  stance: Stance;
  emotion: string;
  narrative: string;
  intensity: number;
}

export interface Narrative {
  name: string;
  share: number;
  stance: Stance;
  samples: { platform: Platform; text: string }[];
}

export interface CrowdSnapshot {
  stance: StanceSplit;
  by_platform: Partial<Record<Platform, StanceSplit>>;
  narratives: Narrative[];
  n: number;
}

export interface BatchUpdate {
  phase: Phase;
  index: number;
  total: number;
  running: CrowdSnapshot;
}

export interface PhaseResult extends CrowdSnapshot {
  phase: Phase;
  simulated: StanceSplit;
  historical: StanceSplit;
  weight: number; // analog weight used in calibration
  sim_vs_history_delta: StanceSplit;
}

// ---- characters ----

export const CharacterCardSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,32}$/),
  name: z.string().min(1).max(40),
  bio: z.string().min(1).max(240),
  values: z.array(z.string().max(60)).min(3).max(5),
  media_diet: z.array(z.string().max(60)).min(1).max(8),
  voice: z.object({
    tone: z.string().max(80),
    slang: z.string().max(120),
    typical_length: z.enum(["short", "medium", "long"]),
    emoji_use: z.enum(["none", "light", "heavy"]),
  }),
  triggers: z.array(z.string().max(60)).max(8),
  crowd_relation: z.enum(["follower", "contrarian", "independent"]),
  sample_posts: z.array(z.string().max(400)).length(3),
  look: z
    .object({
      paper: z.string(),
      skin: z.string(),
      accent: z.string(),
      accessory: z.enum(["cap", "glasses", "tie", "scarf", "hood", "npc"]),
    })
    .optional(),
});
export type CharacterCard = z.infer<typeof CharacterCardSchema>;

export interface CharacterReaction {
  id: string;
  post: string;
  stance: Stance;
  intensity: number;
  with_crowd: boolean;
  reasoning: string;
}

export interface SimulationResult {
  event: ParsedEvent;
  analogs: Analog[];
  phases: PhaseResult[];
  characters: CharacterReaction[];
}

// ---- SSE events, in stream order ----

export interface EngineMeta {
  engine: "local" | "mock";
  model?: string;
  notice?: string;
}

export type SimEvent =
  | { type: "meta"; data: EngineMeta }
  | { type: "parsed"; data: ParsedEvent }
  | { type: "analogs"; data: Analog[] }
  | { type: "batch"; data: BatchUpdate }
  | { type: "phase_done"; data: PhaseResult }
  | { type: "character"; data: CharacterReaction }
  | { type: "done"; data: SimulationResult }
  | { type: "error"; data: { message: string } };
