import { createContext, useContext, type ReactNode } from "react";
import type { Scene, ScenePhase } from "../../scenes/Scene";
import { useScenePhase } from "../../scenes/useScene";

export type ScenePresence = "in" | "out";

/**
 * The current phase is broadcast through context — leaves and hooks then map
 * it to whatever shape they need. The canonical "in"/"out" presence used by
 * `useScenePresenceMotion` is just one such mapping (see `useScenePresence`).
 */
const ScenePhaseContext = createContext<ScenePhase>("inactive");

export function ScenePresenceProvider({
  scene,
  children,
}: {
  scene: Scene;
  children: ReactNode;
}) {
  const phase = useScenePhase(scene);
  return <ScenePhaseContext.Provider value={phase}>{children}</ScenePhaseContext.Provider>;
}

/** Raw lifecycle phase of the nearest scene. */
export function useScenePhaseContext(): ScenePhase {
  return useContext(ScenePhaseContext);
}

/**
 * Canonical phase→presence mapping for fade-in/fade-out leaves: active and
 * entering both read as "in", inactive and exiting as "out". Components that
 * need a different mapping should read the raw phase via
 * `useScenePhaseContext` and map it themselves.
 */
export function useScenePresence(): ScenePresence {
  const phase = useScenePhaseContext();
  return phase === "active" || phase === "entering" ? "in" : "out";
}
