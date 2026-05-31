import { SCORES_CIRCLE_RADIUS } from "../../../utils/constants";
import { parallel, sequence, wait } from "../../animation/Timeline";
import type { TransitionFactory } from "../TransitionContext";
import { ENTER_DURATION_MS, EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell, resizeRing } from "../shells";

/**
 * Gameplay's HUD fades out, then the ring grows to the scores radius while the
 * scores background + UI fade in over it (concurrent with the resize) — so the
 * gameplay scene visibly fades rather than being instantly covered.
 */
export const gameplayToScores: TransitionFactory = (ctx) => {
  const fadeOut = ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS) ?? wait(EXIT_FADE_DURATION_MS);
  const resize = resizeRing(ctx, SCORES_CIRCLE_RADIUS);
  const bgFadeIn = ctx.to?.scenePlayable("enter", ENTER_DURATION_MS);
  return phaseShell(ctx, {
    between: sequence([fadeOut, resize]),
    duringEnter: bgFadeIn ? parallel([bgFadeIn]) : resize,
  });
};
