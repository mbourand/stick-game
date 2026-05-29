"use client";

import { useEffect } from "react";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";
import type { MediaUrls } from "./useBeatmapCatalog";

/**
 * Pushes the focused beatmap's media URLs into the scene so it can start the
 * audio preview and crossfade the background. Cancellation is generation-free
 * — we just gate the assignment with a captured local flag.
 */
export function useScenePreviewBridge(
  scene: BeatmapSelectionScene,
  previewBeatmap: V3BeatmapEntity | null,
  resolveMediaUrls: (beatmap: V3BeatmapEntity) => Promise<MediaUrls | null>,
): void {
  useEffect(() => {
    if (!previewBeatmap) {
      scene.setFocusedBeatmapMedia(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const urls = await resolveMediaUrls(previewBeatmap);
      if (cancelled || !urls) return;
      scene.setFocusedBeatmapMedia(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [previewBeatmap, resolveMediaUrls, scene]);
}
