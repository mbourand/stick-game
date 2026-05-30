import type { TransitionFactory } from "../../engine/transitions/TransitionContext";
import { phaseShell } from "../../engine/transitions/shells";

/**
 * Pause-overlay choreography. The from-scene has no UI to fade out (and stays
 * rendered underneath thanks to PauseScene.isOverlay); the to-scene's DOM UI
 * animates itself via ScenePresence. So both directions degenerate to a
 * phaseShell with one of the two waits zeroed out.
 *
 *   - enter: skip the exit wait. Mark pause entering immediately, then wait
 *     for the React fade-in.
 *   - exit:  wait for pause's React fade-out, then skip the enter wait —
 *     gameplay has no UI to fade in.
 */
export const pauseEnter: TransitionFactory = (ctx) => phaseShell(ctx, { exitMs: 0 });

export const pauseExit: TransitionFactory = (ctx) => phaseShell(ctx, { enterMs: 0 });
