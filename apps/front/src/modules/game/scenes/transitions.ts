import { easeInOutCubic } from "../engine/animation/Easing";
import type { Playable } from "../engine/animation/Playable";
import { parallel, sequence } from "../engine/animation/Timeline";
import { tween } from "../engine/animation/Tween";
import { ENTER_DURATION_MS, EXIT_FADE_DURATION_MS } from "../engine/transitions/durations";
import { phaseShell } from "../engine/transitions/shells";
import type { TransitionContext, TransitionFactory } from "../engine/transitions/TransitionContext";
import { sharedCircle } from "../sharedCircle";

/**
 * Game-side scene transitions. The engine's transition layer
 * (`engine/transitions/`) stays game-agnostic — it only knows `phaseShell` and
 * the phase choreography. Everything that reaches for *this* game's persistent
 * ring lives here.
 *
 * The key idea: a transition is fully determined by a handful of choreography
 * choices (fade the outgoing canvas? fade the incoming one back in? resize the
 * ring, and where in the timeline?). The resize *target* is a property of the
 * destination scene (`Scene.ringRadius`), not of the from→to pair — so one
 * factory serves every route that shares a choreography shape, instead of one
 * file per ordered pair.
 */

/** How long the persistent ring takes to resize between scenes. */
const RING_RESIZE_DURATION_MS = 450;

/**
 * Tween the persistent ring to a target radius — the workhorse of every
 * ring-aware transition. Lives game-side because it reaches for the shared
 * circle entity.
 */
function resizeRing(ctx: TransitionContext, toRadius: number): Playable {
  return tween({
    target: sharedCircle(ctx.engine),
    to: { radius: toRadius },
    duration: RING_RESIZE_DURATION_MS,
    easing: easeInOutCubic,
  });
}

/** The outgoing scene's canvas-side exit fade, if it offers one. */
const exitFade = (ctx: TransitionContext): Playable | null =>
  ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS) ?? null;

/** The incoming scene's canvas-side enter fade, if it offers one. */
const enterFade = (ctx: TransitionContext): Playable | null =>
  ctx.to?.scenePlayable("enter", ENTER_DURATION_MS) ?? null;

/** Resize the ring to the incoming scene's resting radius, or null if it doesn't care. */
const ringResize = (ctx: TransitionContext): Playable | null => {
  const radius = ctx.to?.ringRadius ?? null;
  return radius == null ? null : resizeRing(ctx, radius);
};

/** Combine the present (non-null) playables, or null if none. A lone playable is returned as-is. */
function compose(mode: "sequence" | "parallel", ...items: (Playable | null)[]): Playable | null {
  const present = items.filter((x): x is Playable => x != null);
  if (present.length === 0) return null;
  if (present.length === 1) return present[0];
  return mode === "sequence" ? sequence(present) : parallel(present);
}

/**
 * DOM-only crossfade: ScenePresence drives both UIs, the ring is left alone.
 * Replaces the eight identical pairwise factories (selection↔settings,
 * selection↔downloader, selection↔filter, mainMenu↔settings).
 */
export const crossfade: TransitionFactory = (ctx) => phaseShell(ctx, {});

/** Resize the ring in the gap between the outgoing and incoming UIs. (mainMenu → selection) */
export const resizeBetween: TransitionFactory = (ctx) => phaseShell(ctx, { between: ringResize(ctx) });

/**
 * Fade the outgoing canvas during its exit, resize the ring as the new UI
 * enters. (selection → gameplay, scores → gameplay)
 */
export const fadeOutResizeIn: TransitionFactory = (ctx) =>
  phaseShell(ctx, { duringExit: exitFade(ctx), duringEnter: ringResize(ctx) });

/** Fade the outgoing canvas out, no ring resize (same radius on both sides). (gameplay retry) */
export const fadeOut: TransitionFactory = (ctx) => phaseShell(ctx, { duringExit: exitFade(ctx) });

/**
 * Fade out, then resize the ring (sequenced, in the gap), while the revealed
 * scene's canvas fades back in. (gameplay → scores)
 */
export const fadeResizeRevealSequenced: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    between: compose("sequence", exitFade(ctx), ringResize(ctx)),
    duringEnter: enterFade(ctx),
  });

/**
 * Fade out and resize the ring concurrently during exit, then the revealed
 * scene's canvas fades back in. (gameplay → selection)
 */
export const fadeResizeRevealConcurrent: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    duringExit: compose("parallel", exitFade(ctx), ringResize(ctx)),
    duringEnter: enterFade(ctx),
  });

/**
 * Fade out during exit, resize the ring in the gap, then the revealed scene's
 * canvas fades back in. (scores → selection)
 */
export const fadeResizeRevealStaged: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    duringExit: exitFade(ctx),
    between: ringResize(ctx),
    duringEnter: enterFade(ctx),
  });

/**
 * Pause overlay open: the from-scene stays rendered underneath (PauseScene is
 * an overlay) and has no UI to fade, so skip the exit wait — mark pause
 * entering immediately and wait for its React fade-in.
 */
export const pauseEnter: TransitionFactory = (ctx) => phaseShell(ctx, { exitMs: 0 });

/** Pause overlay close: wait for pause's React fade-out, then skip the enter wait. */
export const pauseExit: TransitionFactory = (ctx) => phaseShell(ctx, { enterMs: 0 });
