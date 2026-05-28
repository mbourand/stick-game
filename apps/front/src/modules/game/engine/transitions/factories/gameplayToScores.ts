import { GameplayScene } from "@/modules/game/scenes/Gameplay/GameplayScene";
import { SCORES_CIRCLE_RADIUS } from "../../../utils/constants";
import { easeInOutCubic } from "../../animation/Easing";
import { call, parallel, sequence, wait } from "../../animation/Timeline";
import { tween } from "../../animation/Tween";
import type { TransitionFactory } from "../TransitionContext";
import { CIRCLE_RESIZE_DURATION_MS, ENTER_DURATION_MS, EXIT_DURATION_MS } from "../durations";

/**
 * Ring grows to the scores radius while gameplay's HUD fades, then the
 * scores screen translates + fades into place.
 */
export const gameplayToScores: TransitionFactory = ({ from, to, circle }) => {
  const gameplayScene = from as GameplayScene;

  return sequence([
    call(() => from?.setPhase("exiting")),
    wait(EXIT_DURATION_MS),
    parallel([
      tween({
        target: gameplayScene.circleInnerContentContainer,
        to: { alpha: 0 },
        duration: EXIT_DURATION_MS / 2,
        easing: easeInOutCubic,
      }),
      tween({
        target: circle,
        to: { radius: SCORES_CIRCLE_RADIUS },
        duration: CIRCLE_RESIZE_DURATION_MS,
        delay: EXIT_DURATION_MS / 2,
        easing: easeInOutCubic,
      }),
    ]),
    call(() => to?.setPhase("entering")),
    wait(ENTER_DURATION_MS),
  ]);
};
