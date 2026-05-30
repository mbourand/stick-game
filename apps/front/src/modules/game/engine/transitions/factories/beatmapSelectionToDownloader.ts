import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/**
 * Push the downloader scene over beatmap selection: DOM ScenePresence handles
 * both UIs' fades (out for selection, in for downloader). No ring resize, no
 * canvas fade — selection's canvas just stops rendering when it goes inactive,
 * the downloader's full-screen backdrop covers anything behind.
 */
export const beatmapSelectionToDownloader: TransitionFactory = (ctx) => phaseShell(ctx, {});
