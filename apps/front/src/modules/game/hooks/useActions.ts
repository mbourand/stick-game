"use client";

import { useEffect } from "react";
import { useEngine } from "../engine/useEngine";
import type { ButtonAction } from "../input/actions";

/** Subscribe to a single button-down event for the lifetime of this hook. */
export function useAction(action: ButtonAction, handler: () => void): void {
  const engine = useEngine();
  useEffect(() => {
    if (!engine) return;
    return engine.getInputSystem().onActionDown(action, handler);
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
  const initialDelayMs = opts.initialDelayMs ?? 350;
  const repeatIntervalMs = opts.repeatIntervalMs ?? 60;
  useEffect(() => {
    if (!engine) return;
    const inputSystem = engine.getInputSystem();
    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    let repeatTimer: ReturnType<typeof setInterval> | null = null;
    const clearTimers = () => {
      if (initialTimer !== null) {
        clearTimeout(initialTimer);
        initialTimer = null;
      }
      if (repeatTimer !== null) {
        clearInterval(repeatTimer);
        repeatTimer = null;
      }
    };
    const offDown = inputSystem.onActionDown(action, () => {
      clearTimers();
      handler();
      initialTimer = setTimeout(() => {
        initialTimer = null;
        repeatTimer = setInterval(handler, repeatIntervalMs);
      }, initialDelayMs);
    });
    const offUp = inputSystem.onActionUp(action, clearTimers);
    return () => {
      offDown();
      offUp();
      clearTimers();
    };
  }, [engine, action, handler, initialDelayMs, repeatIntervalMs]);
}
