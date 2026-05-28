import { call, sequence, wait } from "../../animation/Timeline";
import type { TransitionFactory } from "../TransitionContext";
import { ENTER_DURATION_MS, EXIT_DURATION_MS } from "../durations";

/**
 * Symmetric reverse of mainMenuToBeatmapSelection — same shape, no ring
 * resize, just the two scenes swapping their DOM choreographies.
 */
export const beatmapSelectionToMainMenu: TransitionFactory = ({ from, to }) =>
  sequence([
    call(() => from?.setPhase("exiting")),
    wait(EXIT_DURATION_MS),
    call(() => to?.setPhase("entering")),
    wait(ENTER_DURATION_MS),
  ]);
