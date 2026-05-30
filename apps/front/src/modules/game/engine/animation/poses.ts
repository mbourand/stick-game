/**
 * Pose pairs for `useScenePresenceMotion`. A "pose" is just an object of
 * motion target values; the hook flips between `in` and `out` based on the
 * surrounding scene's presence. Helpers here build common pose-pair shapes
 * so callers don't have to spell out the mirror manually.
 */

export type Pose = { opacity?: number; x?: number; y?: number };

/**
 * Convenience pose-pair for the most common case: opacity fades 0↔1, with an
 * optional axis offset that settles at 0 on enter. Spread into
 * `useScenePresenceMotion`:
 *
 *   useScenePresenceMotion(fade())                // pure fade
 *   useScenePresenceMotion(fade({ y: -12 }))      // fade + slide down
 *   useScenePresenceMotion({ ...fade({ y: 16 }), enterDelay: 0.1 })
 */
export function fade(offset: { x?: number; y?: number } = {}): { in: Pose; out: Pose } {
  const inPose: Pose = { opacity: 1 };
  const outPose: Pose = { opacity: 0 };
  if (offset.x !== undefined) {
    inPose.x = 0;
    outPose.x = offset.x;
  }
  if (offset.y !== undefined) {
    inPose.y = 0;
    outPose.y = offset.y;
  }
  return { in: inPose, out: outPose };
}
