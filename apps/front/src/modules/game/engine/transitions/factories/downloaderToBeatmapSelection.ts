import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/** Reverse of beatmapSelectionToDownloader — DOM ScenePresence drives both fades. */
export const downloaderToBeatmapSelection: TransitionFactory = (ctx) => phaseShell(ctx, {});
