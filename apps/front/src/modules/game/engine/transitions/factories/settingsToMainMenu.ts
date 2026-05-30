import type { TransitionFactory } from "../TransitionContext";
import { phaseShell } from "../shells";

/** Reverse of mainMenuToSettings — DOM ScenePresence drives both fades. */
export const settingsToMainMenu: TransitionFactory = (ctx) => phaseShell(ctx, {});
