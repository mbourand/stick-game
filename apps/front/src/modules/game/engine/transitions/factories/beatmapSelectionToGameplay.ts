import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../../utils/constants";
import type { TransitionFactory } from "../TransitionContext";
import { EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell, resizeRing } from "../shells";

/**
 * BeatmapSelection retracts its buttons, the selection background fades
 * (concurrent with the retract), then the ring shrinks to the gameplay
 * radius while gameplay fades its HUD in.
 */
export const beatmapSelectionToGameplay: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    duringExit: ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS),
    duringEnter: resizeRing(ctx, GAME_CIRCLE_DISPLAYED_RADIUS),
  });
