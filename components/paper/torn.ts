import { seeded } from "@/lib/rng";

export type Edges = { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
const ALL: Edges = { top: true, right: true, bottom: true, left: true };

const cache = new Map<string, string>();

/** Jittered clip-path polygon. Jag is in px so edge depth stays constant at any card size. Cached per seed. */
export function tornClip(seed: string, edges: Edges = ALL, jag = 5, density = 26): string {
  const key = `${seed}|${JSON.stringify(edges)}|${jag}|${density}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const r = seeded(seed);
  const d = (on?: boolean) => (on ? (r() * jag * (r() < 0.12 ? 1.8 : 1)).toFixed(1) : "0");
  const pts: string[] = [];
  const n = density;
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${d(edges.top)}px`);
  for (let i = 1; i <= n; i++) pts.push(`calc(100% - ${d(edges.right)}px) ${((i / n) * 100).toFixed(2)}%`);
  for (let i = 1; i <= n; i++) pts.push(`${(100 - (i / n) * 100).toFixed(2)}% calc(100% - ${d(edges.bottom)}px)`);
  for (let i = 1; i < n; i++) pts.push(`${d(edges.left)}px ${(100 - (i / n) * 100).toFixed(2)}%`);

  const clip = `polygon(${pts.join(",")})`;
  cache.set(key, clip);
  return clip;
}

export function tiltFor(seed: string, max = 2): number {
  return Math.round((seeded(seed + ":tilt")() * 2 - 1) * max * 10) / 10;
}
