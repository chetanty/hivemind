import {
  STANCES,
  type Analog,
  type CrowdSnapshot,
  type Narrative,
  type Phase,
  type PhaseResult,
  type Platform,
  type SimPost,
  type Stance,
  type StanceSplit,
} from "./types";

export const emptySplit = (): StanceSplit =>
  Object.fromEntries(STANCES.map((s) => [s, 0])) as StanceSplit;

export function normalize(split: Partial<StanceSplit>): StanceSplit {
  const out = emptySplit();
  const total = STANCES.reduce((s, k) => s + (split[k] ?? 0), 0);
  if (total <= 0) return out;
  for (const k of STANCES) out[k] = (split[k] ?? 0) / total;
  return out;
}

export function stanceSplit(posts: SimPost[]): StanceSplit {
  const counts = emptySplit();
  for (const p of posts) counts[p.stance] += 1;
  return normalize(counts);
}

export function topStance(split: StanceSplit): Stance {
  return STANCES.reduce((a, b) => (split[b] > split[a] ? b : a));
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

/** Near-duplicate check: one post's opening words appear in the other (survives added prefixes/suffixes). */
function similarText(a: string, b: string) {
  const na = norm(a);
  const nb = norm(b);
  return na.includes(nb.slice(0, 24)) || nb.includes(na.slice(0, 24));
}

/** Group posts by narrative tag, keep the 3–6 biggest, pick 2 samples each (distinct platforms, loudest first). */
export function narratives(posts: SimPost[], max = 6): Narrative[] {
  const groups = new Map<string, SimPost[]>();
  for (const p of posts) {
    const g = groups.get(p.narrative) ?? [];
    g.push(p);
    groups.set(p.narrative, g);
  }
  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const kept = ranked.filter(([, g], i) => i < 3 || g.length / posts.length >= 0.04).slice(0, max);

  return kept.map(([name, group]) => {
    const sorted = [...group].sort((a, b) => b.intensity - a.intensity);
    const samples: SimPost[] = [];
    const dupe = (p: SimPost) => samples.some((s) => similarText(s.text, p.text));
    for (const p of sorted) {
      if (samples.length >= 2) break;
      if (dupe(p)) continue;
      if (samples.some((s) => s.platform === p.platform) && sorted.length > 2) continue;
      samples.push(p);
    }
    for (const p of sorted) {
      if (samples.length >= 2) break;
      if (!dupe(p)) samples.push(p);
    }
    return {
      name,
      share: group.length / posts.length,
      stance: topStance(stanceSplit(group)),
      samples: samples.map((s) => ({ platform: s.platform, text: s.text })),
    };
  });
}

export function snapshot(posts: SimPost[]): CrowdSnapshot {
  const byPlatform = new Map<Platform, SimPost[]>();
  for (const p of posts) byPlatform.set(p.platform, [...(byPlatform.get(p.platform) ?? []), p]);
  return {
    stance: stanceSplit(posts),
    by_platform: Object.fromEntries([...byPlatform].map(([k, v]) => [k, stanceSplit(v)])),
    narratives: narratives(posts),
    n: posts.length,
  };
}

/**
 * Blend simulated split with the analogs' real split, weighted by similarity.
 * final = w * analog + (1 - w) * simulated, w capped at 0.6.
 */
export function calibrate(
  phase: Phase,
  sim: CrowdSnapshot,
  analogs: Analog[],
  analogSplitFor: (a: Analog, phase: Phase) => StanceSplit = (a) => a.stance,
): PhaseResult {
  const simulated = sim.stance;
  if (analogs.length === 0) {
    return { ...sim, phase, simulated, historical: simulated, weight: 0, sim_vs_history_delta: emptySplit() };
  }
  const simTotal = analogs.reduce((s, a) => s + a.similarity, 0);
  const historical = emptySplit();
  for (const a of analogs) {
    const split = analogSplitFor(a, phase);
    for (const k of STANCES) historical[k] += (split[k] * a.similarity) / simTotal;
  }
  const w = Math.min(0.6, simTotal / analogs.length);
  const final = emptySplit();
  const delta = emptySplit();
  for (const k of STANCES) {
    final[k] = w * historical[k] + (1 - w) * simulated[k];
    delta[k] = simulated[k] - historical[k];
  }
  return {
    ...sim,
    phase,
    stance: normalize(final),
    simulated,
    historical,
    weight: w,
    sim_vs_history_delta: delta,
  };
}
