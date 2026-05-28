import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../../utils/constants";
import { easeInOutCubic } from "../../animation/Easing";
import { call, parallel, sequence, wait } from "../../animation/Timeline";
import { tween } from "../../animation/Tween";
import type { TransitionFactory } from "../TransitionContext";
import { CIRCLE_RESIZE_DURATION_MS, ENTER_DURATION_MS, EXIT_DURATION_MS } from "../durations";

/**
 * BeatmapSelection retracts its content, then the ring re-settles at the
 * gameplay radius (currently the default — once the per-user "gameplay
 * circle size" setting lands this is where it'll plug in), then gameplay
 * fades its HUD in.
 */
export const beatmapSelectionToGameplay: TransitionFactory = ({ from, to, circle }) =>
  sequence([
    call(() => from?.setPhase("exiting")),
    wait(EXIT_DURATION_MS),
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
