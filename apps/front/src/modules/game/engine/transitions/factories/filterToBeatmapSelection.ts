import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/** Reverse of beatmapSelectionToFilter — DOM ScenePresence drives both fades. */
export const filterToBeatmapSelection: TransitionFactory = (ctx) => phaseShell(ctx, {});
