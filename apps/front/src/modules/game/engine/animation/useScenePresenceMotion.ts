import { SCENE_TRANSITION_DURATION_S } from "../transitions/durations";
import type { Pose } from "./poses";
import { useScenePresence } from "./scenePresence";

/** Default scene-presence easing — matches the canvas-side curve used by SceneManager transitions. */
const DEFAULT_EASE: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];

export type ScenePresenceMotionOpts = {
  in: Pose;
  out: Pose;
  /** Override the pose used as the motion's initial value. Defaults to whichever pose matches current presence. */
  initial?: Pose;
  /** Transition duration in seconds. Defaults to the canonical scene-transition duration. */
  duration?: number;
  /** Easing curve. Defaults to the canonical scene-transition curve. */
  ease?: readonly [number, number, number, number];
  /** Delay applied when animating toward `in`. Defaults to 0. */
  enterDelay?: number;
  /** Delay applied when animating toward `out`. Defaults to 0. */
  exitDelay?: number;
};

/**
 * Motion props (initial/animate/transition) for a leaf component that should
 * flip between two poses with the surrounding scene's presence. Spread the
 * result onto any motion.* element. What gets animated is the caller's
 * choice — see `fade` in ./poses for the common opacity-fade pattern.
 *
 * All knobs (initial pose, duration, ease, per-direction delays) are
 * overridable. By default the motion uses scene-canonical timing and
 * computes `initial` from current presence so a leaf that mounts already
 * "in" doesn't replay the enter animation.
 */
export function useScenePresenceMotion(opts: ScenePresenceMotionOpts) {
  const presence = useScenePresence();
  const isIn = presence === "in";
  const currentPose = isIn ? opts.in : opts.out;
  return {
    initial: opts.initial ?? currentPose,
    animate: currentPose,
    transition: {
      duration: opts.duration ?? SCENE_TRANSITION_DURATION_S,
      ease: opts.ease ?? DEFAULT_EASE,
      delay: isIn ? opts.enterDelay ?? 0 : opts.exitDelay ?? 0,
    },
  };
}
