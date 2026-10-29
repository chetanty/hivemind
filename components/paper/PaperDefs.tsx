"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

/** Global SVG filters. Cycling the turbulence seed every ~120ms makes every paper edge "boil". */
export function PaperDefs() {
  const turb = useRef<SVGFETurbulenceElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let seed = 1;
    const id = setInterval(() => {
      seed = (seed % 5) + 1;
      turb.current?.setAttribute("seed", String(seed));
    }, 120);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <filter id="boil" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1" />
        <feDisplacementMap in="SourceGraphic" scale="3.5" />
      </filter>
    </svg>
  );
}
