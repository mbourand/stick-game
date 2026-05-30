import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/**
 * Push the settings scene over the main menu. DOM ScenePresence drives both
 * fades (main menu's radial buttons retract, settings panel fades in). No
 * ring resize — the main-menu ring radius matches what settings wants to
 * sit on top of.
 */
export const mainMenuToSettings: TransitionFactory = (ctx) => phaseShell(ctx, {});
