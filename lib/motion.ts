// Stop-motion timing: quantize any easing curve to ~10 fps so tweens snap like animation frames.
export const FPS = 10;

export const backOut = (t: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function stepped(duration: number, ease: (t: number) => number = easeOut) {
  const frames = Math.max(1, Math.round(duration * FPS));
  return (t: number) => ease(Math.ceil(t * frames) / frames);
}

export function stepT(duration: number, delay = 0, ease: (t: number) => number = easeOut, reduced = false) {
  if (reduced) return { duration: 0, delay: 0 };
  return { duration, delay, ease: stepped(duration, ease) };
}
