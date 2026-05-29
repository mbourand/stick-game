import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../../utils/constants";
import type { TransitionFactory } from "../TransitionContext";
import { phaseShell, resizeRing } from "../shells";

/**
 * Retry: scores screen slides + fades out, ring shrinks back to gameplay
 * radius, gameplay HUD fades in (concurrently with the resize).
 */
export const scoresToGameplay: TransitionFactory = (ctx) =>
  phaseShell(ctx, { duringEnter: resizeRing(ctx, GAME_CIRCLE_DISPLAYED_RADIUS) });
