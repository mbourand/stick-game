"use client";

import { useSyncExternalStore } from "react";
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
