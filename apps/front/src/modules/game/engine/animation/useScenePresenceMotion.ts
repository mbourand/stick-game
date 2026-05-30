"use client";

import { SCENE_TRANSITION_DURATION_S } from "../transitions/durations";
import type { Pose } from "./poses";
import { useScenePresence } from "./scenePresence";

/**
 * Canonical curve used for every scene-presence animation. Matches the
 * canvas-side easing the SceneManager choreography assumes.
 */
const SCENE_EASE: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * Motion props (initial/animate/transition) for a leaf component that should
 * flip between two poses with the surrounding scene's presence. Spread the
 * result onto any motion.* element. What gets animated is the caller's
 * choice — see `fade` in ./poses for the common opacity-fade pattern.
 *
 * `initial` is always the `out` pose. When the scene mounts under "out"
 * presence (the phaseShell case), that pose equals the animate target on the
 * mount frame so nothing visibly animates until presence flips to "in". When
 * the scene mounts under "in" presence (overlay scenes like pause, or any
 * leaf that mounts after its scene is already active), the motion runs the
 * full enter animation.
 *
 * `delay` is enter-only (use for staggers). The exit never delays —
 * components clear together when the scene exits.
 */
export function useScenePresenceMotion(opts: { in: Pose; out: Pose; delay?: number }) {
  const presence = useScenePresence();
  const isIn = presence === "in";
  return {
    initial: opts.out,
    animate: isIn ? opts.in : opts.out,
    transition: {
      duration: SCENE_TRANSITION_DURATION_S,
      ease: SCENE_EASE,
      delay: isIn ? opts.delay ?? 0 : 0,
    },
  };
}
