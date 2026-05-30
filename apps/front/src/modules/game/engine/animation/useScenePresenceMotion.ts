"use client";

import { SCENE_TRANSITION_DURATION_S } from "../transitions/durations";
import { SCENE_EASE, useScenePresence } from "./scenePresence";

/**
 * Returns motion props (initial/animate/transition) for a leaf component that
 * should fade with the surrounding scene's presence and optionally slide on
 * one axis. Spread the result onto any motion.* element.
 *
 *   - `x` / `y`: pixel offset while presence is "out". 0 while "in".
 *   - `delay`: enter-only delay in seconds (use for staggers). The exit
 *              never delays — components clear together when the scene exits.
 *   - `enterAnimated`: force motion to mount at the "out" pose even when the
 *              scene's presence is already "in" at mount time. Needed for
 *              overlay scenes (pause) pushed without an exit-phase wait, where
 *              same-frame batching means the React mount sees "in" presence
 *              and motion would otherwise start at the final pose with no
 *              fade. For scenes pushed through phaseShell the exit wait
 *              gives React time to mount under "out" naturally — leave the
 *              flag off there.
 */
export function useScenePresenceMotion(opts: {
  x?: number;
  y?: number;
  delay?: number;
  enterAnimated?: boolean;
} = {}) {
  const presence = useScenePresence();
  const isIn = presence === "in";
  const animate: { opacity: number; x?: number; y?: number } = {
    opacity: isIn ? 1 : 0,
  };
  if (opts.x !== undefined) animate.x = isIn ? 0 : opts.x;
  if (opts.y !== undefined) animate.y = isIn ? 0 : opts.y;

  let initial: false | { opacity: number; x?: number; y?: number } = false;
  if (opts.enterAnimated) {
    initial = { opacity: 0 };
    if (opts.x !== undefined) initial.x = opts.x;
    if (opts.y !== undefined) initial.y = opts.y;
  }

  return {
    initial,
    animate,
    transition: {
      duration: SCENE_TRANSITION_DURATION_S,
      ease: SCENE_EASE,
      delay: isIn ? opts.delay ?? 0 : 0,
    },
  };
}
