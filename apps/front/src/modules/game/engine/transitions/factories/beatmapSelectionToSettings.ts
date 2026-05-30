import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/**
 * Push the settings scene over beatmap selection. DOM ScenePresence drives
 * both fades — selection's content fades out (its own scenePlayable handles
 * the canvas-side inner-container fade), settings panel fades in. The ring
 * stays at the selection radius; the settings backdrop covers what's behind.
 */
export const beatmapSelectionToSettings: TransitionFactory = (ctx) => phaseShell(ctx, {});
