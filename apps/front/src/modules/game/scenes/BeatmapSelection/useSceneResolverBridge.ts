"use client";

import { useEffect } from "react";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { convertFromOsu } from "../../../osu/convert/OsuConverter";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";
import type { MediaUrls } from "./useBeatmapCatalog";

/**
 * Registers a BeatmapResolver on the scene that parses the .osu blob at the
 * given index and attaches resolved media URLs. The resolver is rebuilt every
 * time the filtered list or URL resolver changes, so `index` always refers to
 * the current filtered list.
 */
export function useSceneResolverBridge(
  scene: BeatmapSelectionScene,
  filteredBeatmaps: V3BeatmapEntity[],
  resolveMediaUrls: (beatmap: V3BeatmapEntity) => Promise<MediaUrls | null>,
): void {
  useEffect(() => {
    scene.setBeatmapResolver(async (index) => {
      const beatmap = filteredBeatmaps[index];
      if (!beatmap) return null;
      try {
        const parsed = convertFromOsu(await beatmap.content.text(), (p) => p);
        const urls = await resolveMediaUrls(beatmap);
        if (!urls) return null;
        parsed.audioUrl = urls.audioUrl;
        parsed.backgroundUrl = urls.backgroundUrl;
        return parsed;
      } catch (e) {
        console.error("Failed to load beatmap", e);
        return null;
      }
    });
    return () => scene.setBeatmapResolver(null);
  }, [filteredBeatmaps, resolveMediaUrls, scene]);
}
