import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../../utils/constants";
import { sequence } from "../../animation/Timeline";
import type { TransitionFactory } from "../TransitionContext";
import { EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell, resizeRing } from "../shells";

/**
 * Selection's buttons retract + its inner background fades, the ring shrinks
 * back to the default radius (concurrent with the retract), then the main
 * menu re-appears.
 */
export const beatmapSelectionToMainMenu: TransitionFactory = (ctx) => {
  const resize = resizeRing(ctx, GAME_CIRCLE_DISPLAYED_RADIUS);
  const fadeOut = ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS);
  return phaseShell(ctx, {
    duringExit: fadeOut ? sequence([fadeOut, resize]) : resize,
  });
};
