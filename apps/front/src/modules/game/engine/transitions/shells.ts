import type { Playable } from "../animation/Playable";
import { call, parallel, sequence, wait } from "../animation/Timeline";
import type { TransitionContext } from "./TransitionContext";
import { ENTER_DURATION_MS, EXIT_DURATION_MS } from "./durations";

export type PhaseShellOpts = {
  /** Override the canonical EXIT duration. Set to 0 for overlays that don't fade out the from-scene. */
  exitMs?: number;
  /** Override the canonical ENTER duration. Set to 0 for transitions that have no enter animation. */
  enterMs?: number;
  duringExit?: Playable | null;
  between?: Playable | null;
  duringEnter?: Playable | null;
};

/**
 * Standard scene-swap timeline. Three optional choreography slots are woven
 * around the from-scene's UI-exit wait and the to-scene's UI-enter wait:
 *
 *   - duringExit:  runs in parallel with the from-scene's UI exit anim
 *                  (typically a canvas-side fade).
 *   - between:     runs sequentially in the gap between exit and enter.
 *                  Canonically the ring resize.
 *   - duringEnter: runs in parallel with the to-scene's UI enter anim
 *                  (used when the resize and the enter visually overlap).
 *
 * SceneManager flips `from` to "exiting" before the playable starts. The
 * shell signals `markEntering` at the right moment so the manager can flip
 * `to` to "entering" — the shell itself does not touch Scene phases.
 *
 * Resulting timeline:
 *
 *   parallel( wait(exitMs), duringExit? )
 *   between?
 *   parallel(
 *     sequence( markEntering(), wait(enterMs) ),
 *     duringEnter?,
 *   )
 */
export function phaseShell(ctx: TransitionContext, opts: PhaseShellOpts = {}): Playable {
  const exitMs = opts.exitMs ?? EXIT_DURATION_MS;
  const enterMs = opts.enterMs ?? ENTER_DURATION_MS;
  return sequence(
    compact([
      parallel(compact([wait(exitMs), opts.duringExit])),
      opts.between,
      parallel(
        compact([
          sequence([call(() => ctx.markEntering()), wait(enterMs)]),
          opts.duringEnter,
        ]),
      ),
    ]),
  );
}

function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter((x): x is T => x != null);
}
