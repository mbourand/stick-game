"use client";

import { useEffect } from "react";
import { useEngine } from "../engine/useEngine";
import type { ButtonAction } from "../input/actions";

/** Subscribe to a single button-down event for the lifetime of this hook. */
export function useAction(action: ButtonAction, handler: () => void): void {
  const engine = useEngine();
  useEffect(() => {
    if (!engine) return;
    return engine.inputSystem.onActionDown(action, handler);
  }, [engine, action, handler]);
}

/**
 * Press-and-repeat subscription: handler fires once on press, then once
 * after `initialDelayMs`, then every `repeatIntervalMs` until release.
 * Mirrors Scene.onActionRepeat for React components that need the same
 * behaviour from outside the scene tree (modal UIs, overlays, etc).
 */
export function useActionRepeat(
  action: ButtonAction,
  handler: () => void,
  opts: { initialDelayMs?: number; repeatIntervalMs?: number } = {},
): void {
  const engine = useEngine();
  const initialDelayMs = opts.initialDelayMs;
  const repeatIntervalMs = opts.repeatIntervalMs;
  useEffect(() => {
    if (!engine) return;
    return engine.inputSystem.onActionRepeat(action, handler, {
      initialDelayMs,
      repeatIntervalMs,
    });
  }, [engine, action, handler, initialDelayMs, repeatIntervalMs]);
}
