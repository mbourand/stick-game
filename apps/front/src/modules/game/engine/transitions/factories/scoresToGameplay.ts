import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../../utils/constants";
import type { TransitionFactory } from "../TransitionContext";
import { EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell, resizeRing } from "../shells";

/**
 * Retry: scores screen slides + fades out (UI + canvas background), ring
 * shrinks back to gameplay radius, gameplay HUD fades in (concurrently with
 * the resize).
 */
export const scoresToGameplay: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    duringExit: ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS),
    duringEnter: resizeRing(ctx, GAME_CIRCLE_DISPLAYED_RADIUS),
  });
