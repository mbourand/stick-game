import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../../utils/constants";
import { easeInOutCubic } from "../../animation/Easing";
import { call, parallel, sequence, wait } from "../../animation/Timeline";
import { tween } from "../../animation/Tween";
import type { TransitionFactory } from "../TransitionContext";
import { CIRCLE_RESIZE_DURATION_MS, ENTER_DURATION_MS, EXIT_DURATION_MS } from "../durations";

/**
 * Back to selection: scores screen slides + fades out, ring resizes to the
 * beatmap-selection radius, the beatmap-selection content underneath fades
 * back in.
 */
export const scoresToBeatmapSelection: TransitionFactory = ({ from, to, circle }) =>
  sequence([
    call(() => from?.setPhase("exiting")),
    wait(EXIT_DURATION_MS),
    parallel([
      tween({
        target: circle,
        to: { radius: BEATMAP_SELECTION_CIRCLE_RADIUS },
        duration: CIRCLE_RESIZE_DURATION_MS,
        easing: easeInOutCubic,
      }),
      sequence([call(() => to?.setPhase("entering")), wait(ENTER_DURATION_MS)]),
    ]),
  ]);
