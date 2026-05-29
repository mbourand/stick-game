/**
 * Snap a target y (in screen px, relative to the column's origin) to the
 * nearest item index in a uniformly-pitched vertical list.
 *
 * The Nth item sits at `(N - originItems) * pitchPx`. The picker rounds to
 * the nearest index, then rejects if the candidate is more than `halfHeightPx`
 * away from the target (cursor in a gap between items) or out of range.
 *
 *   - Right (scrolling) column: originItems = scrollOffset
 *   - Left (fixed, centered) column: originItems = (count - 1) / 2
 */
export function pickIndexAtY({
  targetY,
  count,
  pitchPx,
  halfHeightPx,
  originItems,
}: {
  targetY: number;
  count: number;
  pitchPx: number;
  halfHeightPx: number;
  originItems: number;
}): number | null {
  if (count === 0) return null;
  const candidate = Math.round(originItems + targetY / pitchPx);
  if (candidate < 0 || candidate >= count) return null;
  const candidateY = (candidate - originItems) * pitchPx;
  if (Math.abs(candidateY - targetY) > halfHeightPx) return null;
  return candidate;
}
