import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../../utils/constants";
import type { TransitionFactory } from "../TransitionContext";
import { phaseShell, resizeRing } from "../shells";

/**
 * MainMenu retracts its radial buttons + fades its inner content, then the
 * ring grows to the beatmap-selection radius while the selection's buttons
 * expand from the curve.
 */
export const mainMenuToBeatmapSelection: TransitionFactory = (ctx) =>
  phaseShell(ctx, { between: resizeRing(ctx, BEATMAP_SELECTION_CIRCLE_RADIUS) });
