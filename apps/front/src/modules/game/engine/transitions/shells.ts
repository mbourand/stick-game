import { easeInOutCubic } from "../animation/Easing";
import type { Playable } from "../animation/Playable";
import { call, parallel, sequence, wait } from "../animation/Timeline";
import { tween } from "../animation/Tween";
import type { TransitionContext } from "./TransitionContext";
import { CIRCLE_RESIZE_DURATION_MS, ENTER_DURATION_MS, EXIT_DURATION_MS } from "./durations";

/**
 * Standard scene-swap timeline. Three optional choreography slots are woven
 * around the from-scene's UI-exit wait and the to-scene's UI-enter wait:
 *
 *   - duringExit:  runs in parallel with the from-scene's UI exit anim
 *                  (typically a canvas-side fade, e.g. `exitFadePlayable`).
 *   - between:     runs sequentially in the gap between exit and enter.
 *                  Canonically the ring resize.
 *   - duringEnter: runs in parallel with the to-scene's UI enter anim
 *                  (used when the resize and the enter visually overlap).
 *
 * SceneManager flips `from` to "exiting" before the playable starts, so
 * the from-scene's UI is already animating out when the timeline begins.
 * The shell only needs to flip `to` to "entering" at the right moment.
 *
 * Resulting timeline:
 *
 *   parallel( wait(EXIT_DURATION_MS), duringExit? )
 *   between?
 *   parallel(
 *     sequence( to.setPhase("entering"), wait(ENTER_DURATION_MS) ),
 *     duringEnter?,
 *   )
 */
export function phaseShell(
  { to }: TransitionContext,
  slots: {
    duringExit?: Playable | null;
    between?: Playable | null;
    duringEnter?: Playable | null;
  },
): Playable {
  return sequence(
    compact([
      parallel(compact([wait(EXIT_DURATION_MS), slots.duringExit])),
      slots.between,
      parallel(
        compact([
          sequence([call(() => to?.setPhase("entering")), wait(ENTER_DURATION_MS)]),
          slots.duringEnter,
        ]),
      ),
    ]),
  );
}

/**
 * Tween the persistent ring's radius — the workhorse of every transition's
 * choreography. Canonical duration + easing live here so factories don't
 * re-spell them.
 */
export function resizeRing(ctx: TransitionContext, toRadius: number): Playable {
  return tween({
    target: ctx.circle,
    to: { radius: toRadius },
    duration: CIRCLE_RESIZE_DURATION_MS,
    easing: easeInOutCubic,
  });
}

function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter((x): x is T => x != null);
}
