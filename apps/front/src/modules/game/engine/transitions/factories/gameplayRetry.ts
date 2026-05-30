import type { TransitionFactory } from "../TransitionContext";
import { EXIT_FADE_DURATION_MS } from "../durations";
import { phaseShell } from "../shells";

/**
 * Restart the current beatmap: outgoing gameplay content fades out, fresh
 * gameplay fades in. No ring resize — both sides use the gameplay radius.
 */
export const gameplayRetry: TransitionFactory = (ctx) =>
  phaseShell(ctx, {
    duringExit: ctx.from?.scenePlayable("exit", EXIT_FADE_DURATION_MS),
  });
