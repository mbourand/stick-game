import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../../utils/constants";
import { EXIT_FADE_DURATION_MS } from "../durations";
import type { TransitionFactory } from "../TransitionContext";
import { phaseShell, resizeRing } from "../shells";
import { parallel } from "@/modules/game/engine/animation/Timeline";
import { GameplayScene } from "@/modules/game/scenes/Gameplay/GameplayScene";

/**
 * Exit gameplay back to the beatmap selection screen: gameplay content fades
 * out, ring grows back to the selection radius, the selection content
 * underneath fades back in (via its own ScenePresence-driven DOM motion).
 */
export const gameplayToBeatmapSelection: TransitionFactory = (ctx) => {
  const gameplayScene = ctx.from as GameplayScene | undefined;
  if (!gameplayScene) {
    // This shouldn't happen since the transition should only be triggered by
    // the gameplay scene itself, but guard against it just in case.
    console.warn("gameplayToBeatmapSelection transition triggered without a from scene");
    return phaseShell(ctx, { duringExit: resizeRing(ctx, BEATMAP_SELECTION_CIRCLE_RADIUS) });
  }

  return phaseShell(ctx, {
    duringExit: parallel([
      gameplayScene.exitFadePlayable(EXIT_FADE_DURATION_MS),
      resizeRing(ctx, BEATMAP_SELECTION_CIRCLE_RADIUS),
    ]),
  });
};
