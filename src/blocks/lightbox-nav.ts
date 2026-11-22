/** The index of the picture `delta` steps from `index`, wrapping around at both ends. */
export function stepIndex(index: number, delta: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}

/** How far a finger must travel sideways, in pixels, for a swipe to count. */
export const SWIPE_THRESHOLD = 50;

/**
 * Which way a swipe goes: 1 for the next picture (finger moved left), -1 for the previous one
 * (finger moved right), 0 when it was too short or more vertical than horizontal.
 */
export function swipeStep(dx: number, dy: number, threshold: number = SWIPE_THRESHOLD): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}
