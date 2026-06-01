import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../../utils/constants";
import type { TransitionFactory } from "../TransitionContext";
import { ENTER_DURATION_MS, EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell, resizeRing } from "../shells";

/**
 * Back to selection: scores screen slides + fades out (UI + canvas background),
 * ring resizes to the beatmap-selection radius, the beatmap-selection content
 * underneath fades back in — its DOM via ScenePresence motion, its canvas
 * background via the "enter" slot (so it eases in rather than popping).
 */
export const scoresToBeatmapSelection: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    duringExit: ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS),
    between: resizeRing(ctx, BEATMAP_SELECTION_CIRCLE_RADIUS),
    duringEnter: ctx.to?.scenePlayable("enter", ENTER_DURATION_MS),
  });
