import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/** Reverse of beatmapSelectionToSettings — DOM ScenePresence drives both fades. */
export const settingsToBeatmapSelection: TransitionFactory = (ctx) => phaseShell(ctx, {});
