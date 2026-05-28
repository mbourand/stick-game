import { call, sequence, wait } from "../../animation/Timeline";
import type { TransitionFactory } from "../TransitionContext";
import { ENTER_DURATION_MS, EXIT_DURATION_MS } from "../durations";

/**
 * MainMenu retracts its radial buttons + fades its inner content, then
 * BeatmapSelection's buttons expand from the center + its content fades in.
 * No ring resize — both scenes share the default circle.
 */
export const mainMenuToBeatmapSelection: TransitionFactory = ({ from, to }) =>
  sequence([
    call(() => from?.setPhase("exiting")),
    wait(EXIT_DURATION_MS),
    call(() => to?.setPhase("entering")),
    wait(ENTER_DURATION_MS),
  ]);
