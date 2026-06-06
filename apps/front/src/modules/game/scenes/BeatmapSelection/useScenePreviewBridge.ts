import { useEffect } from "react";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import type { BeatmapSelectionScene, MediaUrls } from "./BeatmapSelectionScene";

/**
 * Pushes the focused beatmap's media URLs into the scene so it can start the
 * audio preview and crossfade the background. Cancellation is generation-free
 * — we just gate the assignment with a captured local flag.
 *
 * We intentionally never push `null`. `previewBeatmap` is only null in two
 * transient cases: the first render before any focus has settled, and the
 * first render after the view remounts (e.g. popping back from the
 * filter/downloader/settings overlays — `usePreviewBeatmap`'s sticky-last
 * state is reset by the unmount). Pushing null in either case would stop the
 * scene's still-playing preview only to restart it from 0 a tick later when
 * focus reconciles. The scene's `currentMedia` survives these transients.
 */
export function useScenePreviewBridge(
  scene: BeatmapSelectionScene,
  previewBeatmap: V3BeatmapEntity | null,
  resolveMediaUrls: (beatmap: V3BeatmapEntity) => Promise<MediaUrls | null>,
): void {
  useEffect(() => {
    if (!previewBeatmap) return;
    let cancelled = false;
    void (async () => {
      const urls = await resolveMediaUrls(previewBeatmap);
      if (cancelled || !urls) return;
      scene.setFocusedBeatmapMedia(
        urls,
        { title: previewBeatmap.title, artist: previewBeatmap.artist },
        previewBeatmap.idv2,
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [previewBeatmap, resolveMediaUrls, scene]);
}
