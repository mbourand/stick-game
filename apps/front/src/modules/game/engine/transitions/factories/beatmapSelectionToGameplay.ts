import type { BeatmapSelectionScene } from "../../../scenes/BeatmapSelection/BeatmapSelectionScene";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../../utils/constants";
import { easeInOutCubic } from "../../animation/Easing";
import { call, parallel, sequence, wait } from "../../animation/Timeline";
import { tween } from "../../animation/Tween";
import type { TransitionFactory } from "../TransitionContext";
import { CIRCLE_RESIZE_DURATION_MS, ENTER_DURATION_MS, EXIT_DURATION_MS } from "../durations";

/**
 * BeatmapSelection retracts its buttons, the selection background fades and
 * the ring shrinks to the gameplay radius, then gameplay fades its HUD in.
 */
export const beatmapSelectionToGameplay: TransitionFactory = ({ from, to, circle }) => {
  const selection = from as BeatmapSelectionScene | null;

  return sequence([
    call(() => from?.setPhase("exiting")),
    parallel([
      ...(selection
        ? [
            tween({
              target: selection.innerContainer,
              to: { alpha: 0 },
              duration: EXIT_DURATION_MS / 2,
              easing: easeInOutCubic,
            }),
          ]
        : []),
      sequence([wait(EXIT_DURATION_MS)]),
    ]),
    parallel([
      tween({
        target: circle,
        to: { radius: GAME_CIRCLE_DISPLAYED_RADIUS },
        duration: CIRCLE_RESIZE_DURATION_MS,
        easing: easeInOutCubic,
      }),
      sequence([call(() => to?.setPhase("entering")), wait(ENTER_DURATION_MS)]),
    ]),
  ]);
};
