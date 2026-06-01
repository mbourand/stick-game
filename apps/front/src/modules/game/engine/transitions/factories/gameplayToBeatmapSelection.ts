import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../../utils/constants";
import { ENTER_DURATION_MS, EXIT_FADE_DURATION_MS } from "../durations";
import type { TransitionFactory } from "../TransitionContext";
import { phaseShell, resizeRing } from "../shells";
import { parallel } from "@/modules/game/engine/animation/Timeline";

/**
 * Exit gameplay back to the beatmap selection screen: gameplay content fades
 * out, ring grows back to the selection radius, the selection content
 * underneath fades back in — its DOM via ScenePresence motion, its canvas
 * background via the "enter" slot (so the circle background eases in rather
 * than popping).
 */
export const gameplayToBeatmapSelection: TransitionFactory = (ctx) => {
  const fadeOut = ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS);
  const resize = resizeRing(ctx, BEATMAP_SELECTION_CIRCLE_RADIUS);
  return phaseShell(ctx, {
    duringExit: fadeOut ? parallel([fadeOut, resize]) : resize,
    duringEnter: ctx.to?.scenePlayable("enter", ENTER_DURATION_MS),
  });
};
