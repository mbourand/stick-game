import { SCORES_CIRCLE_RADIUS } from "../../../utils/constants";
import { sequence, wait } from "../../animation/Timeline";
import type { TransitionFactory } from "../TransitionContext";
import { EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell, resizeRing } from "../shells";

/**
 * After exit-wait: gameplay's HUD fades, then the ring grows to the scores
 * radius. Finally the scores screen translates + fades into place.
 */
export const gameplayToScores: TransitionFactory = (ctx) => {
  const fadeOut = ctx.from?.exitFadePlayable(EXIT_FADE_DURATION_MS) ?? wait(EXIT_FADE_DURATION_MS);
  return phaseShell(ctx, {
    between: sequence([fadeOut, resizeRing(ctx, SCORES_CIRCLE_RADIUS)]),
  });
};
