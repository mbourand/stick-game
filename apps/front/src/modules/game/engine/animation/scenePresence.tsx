"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Scene } from "../../scenes/Scene";
import { useScenePhase } from "../../scenes/useScene";

export type ScenePresence = "in" | "out";

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
