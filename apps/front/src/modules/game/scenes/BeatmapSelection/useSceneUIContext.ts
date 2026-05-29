"use client";

import { useEffect } from "react";
import type {
  BeatmapSelectionScene,
  BeatmapSelectionUIContext,
} from "./BeatmapSelectionScene";

/** One-shot push of the input routing snapshot — modal block, back routing, left actions. */
export function useSceneUIContext(
  scene: BeatmapSelectionScene,
  ctx: BeatmapSelectionUIContext,
): void {
  useEffect(() => {
    scene.setUIContext(ctx);
    return () => scene.resetUIContext();
  }, [scene, ctx]);
}
