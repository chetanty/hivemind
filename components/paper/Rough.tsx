"use client";

import { useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { hashString } from "@/lib/rng";
import { STANCES, type Stance, type StanceSplit } from "@/lib/types";

// Fill patterns double-encode stance so the strips don't rely on color alone.
const FILL: Record<Stance, string> = {
  condemn: "solid",
  support: "hachure",
  indifferent: "zigzag",
  conspiracy: "cross-hatch",
  humor: "dashed",
};
export const HEX: Record<Stance, string> = {
  condemn: "#b3261e",
  support: "#2b5c9e",
  indifferent: "#776f64",
  conspiracy: "#56662a",
  humor: "#c98a12",
};
const INK = "#211c17";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function clear(svg: SVGSVGElement) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
}

/** Stacked stance strip, sketched. */
export function RoughStrip({ split, height = 26, seed, label }: { split: StanceSplit; height?: number; seed: string; label: string }) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const svg = useRef<SVGSVGElement>(null);
  const key = STANCES.map((s) => split[s].toFixed(3)).join(",");

  useEffect(() => {
    const el = svg.current;
    if (!el || w < 10) return;
    clear(el);
    const rc = rough.svg(el);
    const base = hashString(seed) % 2 ** 20;
    let x = 2;
    const inner = w - 4;
    STANCES.forEach((s, i) => {
      const sw = split[s] * inner;
      if (sw < 1.5) return;
      el.appendChild(
        rc.rectangle(x, 3, sw, height - 6, {
          seed: base + i,
          fill: HEX[s],
          fillStyle: FILL[s],
          fillWeight: s === "condemn" ? 1 : 1.6,
          hachureGap: 4.5,
          stroke: INK,
          strokeWidth: 1.1,
          roughness: 1.3,
        }),
      );
      x += sw;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, height, seed]);

  const desc = STANCES.map((s) => `${s} ${Math.round(split[s] * 100)}%`).join(", ");
  return (
    <div ref={wrap} className="w-full" role="img" aria-label={`${label}: ${desc}`}>
      <svg ref={svg} width={w} height={height} aria-hidden className="block" />
    </div>
  );
}

/** Single-value sketch bar (intensity). */
export function RoughMeter({ value, color = HEX.condemn, seed, height = 14 }: { value: number; color?: string; seed: string; height?: number }) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const svg = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const el = svg.current;
    if (!el || w < 10) return;
    clear(el);
    const rc = rough.svg(el);
    const s = hashString(seed) % 2 ** 20;
    el.appendChild(rc.rectangle(2, 2, w - 4, height - 4, { seed: s, stroke: INK, strokeWidth: 1, roughness: 1.2 }));
    if (value > 0.01)
      el.appendChild(
        rc.rectangle(3, 3, (w - 6) * value, height - 6, { seed: s + 1, fill: color, fillStyle: "hachure", hachureGap: 3, stroke: "none", roughness: 1.4 }),
      );
  }, [value, w, color, seed, height]);
  return (
    <div ref={wrap} className="w-full">
      <svg ref={svg} width={w} height={height} aria-hidden className="block" />
    </div>
  );
}

/** Small sketched line chart: each stance's share across phases. */
export function RoughDrift({ series, labels, seed }: { series: StanceSplit[]; labels: string[]; seed: string }) {
  const [wrap, w] = useWidth<HTMLDivElement>();
  const svg = useRef<SVGSVGElement>(null);
  const h = 110;
  const key = series.map((sp) => STANCES.map((s) => sp[s].toFixed(3)).join(",")).join("|");

  useEffect(() => {
    const el = svg.current;
    if (!el || w < 10) return;
    clear(el);
    const rc = rough.svg(el);
    const base = hashString(seed) % 2 ** 20;
    const padL = 6, padR = 6, top = 8, bottom = h - 20;
    const max = Math.max(0.3, ...series.flatMap((sp) => STANCES.map((s) => sp[s])));
    const xs = labels.map((_, i) => (labels.length === 1 ? w / 2 : padL + (i * (w - padL - padR)) / (labels.length - 1)));
    const y = (v: number) => bottom - (v / max) * (bottom - top);
    el.appendChild(rc.line(padL, bottom, w - padR, bottom, { seed: base, stroke: INK, strokeWidth: 1, roughness: 1.5 }));
    STANCES.forEach((s, si) => {
      const pts = series.map((sp, i) => [xs[i], y(sp[s])] as [number, number]);
      if (pts.length > 1) el.appendChild(rc.linearPath(pts, { seed: base + si + 1, stroke: HEX[s], strokeWidth: 2, roughness: 1.2 }));
      pts.forEach(([px, py], i) =>
        el.appendChild(rc.circle(px, py, 6, { seed: base + si * 7 + i, fill: HEX[s], fillStyle: "solid", stroke: INK, strokeWidth: 0.8, roughness: 0.8 })),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, w, seed, labels.join()]);

  return (
    <div ref={wrap} className="relative w-full">
      <svg ref={svg} width={w} height={h} aria-hidden className="block" />
      <div className="flex justify-between font-hand text-base leading-none text-ink-soft">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
