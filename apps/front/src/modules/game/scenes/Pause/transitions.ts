import { call, sequence, wait } from "../../engine/animation/Timeline";
import { SCENE_TRANSITION_DURATION_MS } from "../../engine/transitions/durations";
import type { TransitionFactory } from "../../engine/transitions/TransitionContext";

/**
 * Pause-overlay choreography. The from-scene has no UI to fade out and the
 * to-scene's DOM UI animates itself via ScenePresence, so these are
 * intentionally minimal: enter flips pause to "entering" immediately and
 * waits for the React fade-in; exit just holds the canvas-side timeline open
 * for the React fade-out.
 */
export const pauseEnter: TransitionFactory = ({ to }) =>
  sequence([call(() => to?.setPhase("entering")), wait(SCENE_TRANSITION_DURATION_MS)]);

export const pauseExit: TransitionFactory = () => wait(SCENE_TRANSITION_DURATION_MS);
