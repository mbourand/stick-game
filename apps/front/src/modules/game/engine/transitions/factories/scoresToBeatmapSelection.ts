import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../../utils/constants";
import type { TransitionFactory } from "../TransitionContext";
import { EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell, resizeRing } from "../shells";

/**
 * Back to selection: scores screen slides + fades out (UI + canvas background),
 * ring resizes to the beatmap-selection radius, the beatmap-selection content
 * underneath fades back in (concurrently with the resize).
 */
export const scoresToBeatmapSelection: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    duringExit: ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS),
    between: resizeRing(ctx, BEATMAP_SELECTION_CIRCLE_RADIUS),
  });
