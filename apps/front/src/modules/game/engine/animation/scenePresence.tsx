"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Scene } from "../../scenes/Scene";
import { useScenePhase } from "../../scenes/useScene";
import {
  SCENE_TRANSITION_DURATION_S,
} from "../transitions/durations";

export type ScenePresence = "in" | "out";

/**
 * Canonical curve used for every scene-presence animation. Matches the
 * canvas-side easing the SceneManager choreography assumes.
 */
export const SCENE_EASE: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];

const ScenePresenceContext = createContext<ScenePresence>("in");

/**
 * Translates a scene's lifecycle phase into a simple "in"/"out" presence
 * value and broadcasts it via context. Children call useScenePresence or
 * useScenePresenceMotion to consume it without prop drilling.
 */
export function ScenePresenceProvider({
  scene,
  children,
}: {
  scene: Scene;
  children: ReactNode;
}) {
  const phase = useScenePhase(scene);
  const presence: ScenePresence =
    phase === "active" || phase === "entering" ? "in" : "out";
  return (
    <ScenePresenceContext.Provider value={presence}>
      {children}
    </ScenePresenceContext.Provider>
  );
}

/** Read the nearest scene's presence ("in" while active/entering, "out" otherwise). */
export function useScenePresence(): ScenePresence {
  return useContext(ScenePresenceContext);
}

/**
 * Returns motion props (initial/animate/transition) for a leaf component that
 * should fade with the surrounding scene's presence and optionally slide on
 * one axis. Spread the result onto any motion.* element.
 *
 *   - `x` / `y`: pixel offset while presence is "out". 0 while "in".
 *   - `delay`: enter-only delay in seconds (use for staggers). The exit
 *              never delays — components clear together when the scene exits.
 */
export function useScenePresenceMotion(opts: {
  x?: number;
  y?: number;
  delay?: number;
} = {}) {
  const presence = useScenePresence();
  const isIn = presence === "in";
  const animate: { opacity: number; x?: number; y?: number } = {
    opacity: isIn ? 1 : 0,
  };
  if (opts.x !== undefined) animate.x = isIn ? 0 : opts.x;
  if (opts.y !== undefined) animate.y = isIn ? 0 : opts.y;
  return {
    initial: false as const,
    animate,
    transition: {
      duration: SCENE_TRANSITION_DURATION_S,
      ease: SCENE_EASE,
      delay: isIn ? opts.delay ?? 0 : 0,
    },
  };
}
