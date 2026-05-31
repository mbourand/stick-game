import { useSyncExternalStore } from "react";
import type { Scene } from "./Scene";
import type { SceneManager } from "./SceneManager";

export function useTopScene(sceneManager: SceneManager) {
  return useSyncExternalStore(
    sceneManager.subscribe,
    sceneManager.getTopScene,
    sceneManager.getTopScene,
  );
}

export function useSceneStack(sceneManager: SceneManager) {
  return useSyncExternalStore(
    sceneManager.subscribe,
    sceneManager.getStack,
    sceneManager.getStack,
  );
}

/**
 * Returns the in-flight transition (if any). Used by the DOM overlay to
 * keep both the outgoing and incoming scene UIs mounted during a transition
 * so their own React-side choreographies (button retract, content fade) can
 * play.
 */
export function useTransition(sceneManager: SceneManager) {
  return useSyncExternalStore(
    sceneManager.subscribe,
    sceneManager.getTransition,
    sceneManager.getTransition,
  );
}

/** Live phase of a scene (inactive / entering / active / exiting). */
export function useScenePhase(scene: Scene) {
  return useSyncExternalStore(scene.subscribePhase, scene.getPhase, scene.getPhase);
}
