import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../../utils/constants";
import type { TransitionFactory } from "../TransitionContext";
import { phaseShell, resizeRing } from "../shells";

/**
 * Back to selection: scores screen slides + fades out, ring resizes to the
 * beatmap-selection radius, the beatmap-selection content underneath fades
 * back in (concurrently with the resize).
 */
export const scoresToBeatmapSelection: TransitionFactory = (ctx) =>
  phaseShell(ctx, { duringEnter: resizeRing(ctx, BEATMAP_SELECTION_CIRCLE_RADIUS) });
