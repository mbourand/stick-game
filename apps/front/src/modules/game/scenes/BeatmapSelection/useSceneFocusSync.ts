import { useEffect } from "react";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { useStore } from "../../engine/state/useStore";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";

/**
 * Subscribes to `scene.focusedIndex`, pushes count to the scene, and
 * reconciles focus across filter changes (or other list mutations) by
 * matching the scene-persisted `focusedBeatmapIdv2`. If the prior focus is
 * still in the list, we keep it; otherwise we snap to the first match.
 *
 * The remembered id lives on the scene (not a view ref) so reconciliation
 * also works after the view unmounts and remounts — e.g. when the user
 * pops back from the downloader/filter overlay scenes.
 *
 * While `isNoMatch` is true we leave focus + preview alone (the user is
 * mid-typing and we don't want to tear the preview down). While
 * `isLoaded` is false (Dexie's first resolution hasn't landed) we skip
 * entirely — otherwise a remount would push count=0 into the scene
 * before the real data arrives, wiping the preserved focus + scroll.
 *
 * Returns the currently focused index and the resolved focused beatmap.
 */
export function useSceneFocusSync(
  scene: BeatmapSelectionScene,
  filteredBeatmaps: V3BeatmapEntity[],
  isNoMatch: boolean,
  isLoaded: boolean,
): { focusedIndex: number | null; focusedBeatmap: V3BeatmapEntity | null } {
  const focusedIndex = useStore(scene.focusedIndex);
  const focusedBeatmap = focusedIndex !== null ? filteredBeatmaps[focusedIndex] ?? null : null;

  // Reconciliation runs BEFORE the id-sync effect below so it sees the prior id.
  useEffect(() => {
    if (!isLoaded || isNoMatch) return;
    scene.setBeatmapCount(filteredBeatmaps.length);
    if (filteredBeatmaps.length === 0) {
      scene.focusedIndex.set(null);
      return;
    }
    const remembered = scene.focusedBeatmapIdv2.get();
    if (remembered === null) return;
    const newIndex = filteredBeatmaps.findIndex((b) => b.idv2 === remembered);
    const target = newIndex >= 0 ? newIndex : 0;
    scene.focusedIndex.set(target);
    scene.scrollTo(target);
  }, [filteredBeatmaps, scene, isNoMatch, isLoaded]);

  useEffect(() => {
    if (focusedIndex === null) return;
    const beatmap = filteredBeatmaps[focusedIndex];
    if (beatmap) scene.focusedBeatmapIdv2.set(beatmap.idv2);
  }, [focusedIndex, filteredBeatmaps, scene]);

  return { focusedIndex, focusedBeatmap };
}
