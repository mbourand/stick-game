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
 */
export function useScenePresenceMotion(opts: {
  x?: number;
  y?: number;
  delay?: number;
} = {}) {
  const presence = useScenePresence();
  const isIn = presence === "in";
  const animate: { opacity: number; x?: number; y?: number } = {
    opacity: isIn ? 1 : 0,
  };
  if (opts.x !== undefined) animate.x = isIn ? 0 : opts.x;
  if (opts.y !== undefined) animate.y = isIn ? 0 : opts.y;
  return {
    initial: false as const,
    animate,
    transition: {
      duration: SCENE_TRANSITION_DURATION_S,
      ease: SCENE_EASE,
      delay: isIn ? opts.delay ?? 0 : 0,
    },
  };
}
