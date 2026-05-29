import { wait } from "../../animation/Timeline";
import { SCENE_TRANSITION_DURATION_MS } from "../durations";
import type { TransitionFactory } from "../TransitionContext";

/**
 * PauseScene's exit choreography. The overlay's fade-out is driven entirely
 * by its React UI (via the ScenePresence context); this factory just holds
 * the canvas-side timeline open long enough for that DOM animation to play.
 */
export const pauseExit: TransitionFactory = () => wait(SCENE_TRANSITION_DURATION_MS);
