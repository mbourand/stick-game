import { call, sequence, wait } from "../../animation/Timeline";
import { SCENE_TRANSITION_DURATION_MS } from "../durations";
import type { TransitionFactory } from "../TransitionContext";

/**
 * Push the pause scene over gameplay. We don't use phaseShell because the
 * from-scene (gameplay) has no UI to fade out — only pause's DOM UI animates,
 * driven by ScenePresence. We flip pause to "entering" immediately so the
 * fade-in starts as soon as the playable runs, then wait the same duration
 * the React fade takes.
 */
export const pauseEnter: TransitionFactory = ({ to }) =>
  sequence([
    call(() => to?.setPhase("entering")),
    wait(SCENE_TRANSITION_DURATION_MS),
  ]);
