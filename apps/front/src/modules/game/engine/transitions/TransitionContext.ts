import type { Scene } from "../../scenes/Scene";
import type { CircleLayer } from "../layers/CircleLayer";
import type { Playable } from "../animation/Playable";

/** Which kind of stack mutation a transition is wrapping. */
export type TransitionKind = "push" | "pop" | "replace";

/**
 * Everything a transition factory needs to compose its choreography.
 *
 *   - `from` / `to` — the outgoing and incoming scenes. Either may be null
 *     (e.g., the very first push has no `from`; popping the last scene has
 *     no `to`). Transitions should handle both cases gracefully.
 *
 *   - `kind` — push / pop / replace. Lets a single factory adapt its
 *     direction (e.g., for radius shrink-vs-grow).
 *
 *   - `circle` — the persistent ring. Mutate `radius`, `ringAlpha`,
 *     `innerAlpha`, etc. and they survive across the scene swap.
 */
export type TransitionContext = {
  from: Scene | null;
  to: Scene | null;
  kind: TransitionKind;
  circle: CircleLayer;
};

/**
 * A transition is a pure function: given the context, return a Playable
 * that, when finished, signals the SceneManager to finalize the swap.
 *
 * Why a factory instead of a Playable directly? The context isn't known
 * until the SceneManager kicks off the transition (it has to capture the
 * actual `from`/`to` scenes), and the factory keeps transitions free of
 * captured state — easy to compose, register, and reuse.
 */
export type TransitionFactory = (ctx: TransitionContext) => Playable;
