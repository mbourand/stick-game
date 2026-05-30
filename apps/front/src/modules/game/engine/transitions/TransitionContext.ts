import type { Engine } from "../Engine";
import type { Scene } from "../../scenes/Scene";
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
 *   - `engine` — full engine access. Factories reach for whatever persistent
 *     state they need (circle, playables scheduler, audio, …) without
 *     forcing this type to enumerate them up front.
 *
 *   - `markEntering` — fire exactly once at the moment the `to` scene's UI
 *     should start its enter animation. The SceneManager owns the actual
 *     `to.setPhase("entering")` flip; factories only signal *when*.
 */
export type TransitionContext = {
  from: Scene | null;
  to: Scene | null;
  kind: TransitionKind;
  engine: Engine;
  markEntering: () => void;
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
