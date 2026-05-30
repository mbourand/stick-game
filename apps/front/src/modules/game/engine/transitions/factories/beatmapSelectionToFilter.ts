import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/** Push the filter scene over beatmap selection. DOM-only fades. */
export const beatmapSelectionToFilter: TransitionFactory = (ctx) => phaseShell(ctx, {});
