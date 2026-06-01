import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { DIFFICULTY_SLIDER_MAX, type DifficultyFilter } from "../Filter/filterTypes";
import { latestDb } from "@/modules/db/db";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";

export type BeatmapCatalog = {
  /** Raw library, pre-filter — used to tell "empty library" apart from "filter matched nothing". */
  beatmaps: V3BeatmapEntity[];
  /** Library after search + difficulty filter. The list the user actually navigates. */
  filteredBeatmaps: V3BeatmapEntity[];
  /** True iff a search/filter is active AND it filtered to zero. */
  isNoMatch: boolean;
  /**
   * False during the first render(s) after mount, while Dexie's live query is
   * still resolving. Lets downstream sync hooks skip pushing transient
   * "library has 0 maps" states into the scene, which would otherwise clobber
   * preserved focus/scroll when the view remounts on scene re-entry.
   */
  isLoaded: boolean;
};

/**
 * Filter inputs are passed in (not held inside) so the view can source them
 * from a scene-owned Store and keep them alive while the view unmounts.
 *
 * Note: this hook is the *list* concern only. Resolving a beatmap's blob URLs
 * lives on `BeatmapSelectionScene.resolveMediaUrls` so its cache survives
 * view remounts — see the scene for the rationale.
 */
export function useBeatmapCatalog(
  searchQuery: string,
  difficultyFilter: DifficultyFilter | null,
  dailyScopeIds: Set<string> | null = null,
): BeatmapCatalog {
  // No default value — returns `undefined` until Dexie resolves. We need to
  // tell "not loaded yet" apart from "loaded but empty" so the focus-sync
  // effect doesn't push count=0 into the scene during the first render after
  // a remount (which would clobber preserved focus + scroll).
  const liveBeatmaps = useLiveQuery(
    () => latestDb.beatmaps.toArray().then((maps) => maps.sort((a, b) => b.difficulty - a.difficulty)),
    [],
  );
  const isLoaded = liveBeatmaps !== undefined;
  const beatmaps = useMemo(() => liveBeatmaps ?? [], [liveBeatmaps]);

  const filteredBeatmaps = useMemo(() => {
    let result = beatmaps;
    // Daily scope is the strongest filter: pin the list to exactly the featured
    // set's difficulties. Search/difficulty are cleared on activation but still
    // composed here so the pipeline stays a single source of truth.
    if (dailyScopeIds !== null) {
      result = result.filter((b) => dailyScopeIds.has(b.idv2));
    }
    if (difficultyFilter !== null) {
      // Slider parked at the max means "no upper bound" — keep maps above the slider range.
      const effectiveMax = difficultyFilter.max >= DIFFICULTY_SLIDER_MAX ? Infinity : difficultyFilter.max;
      result = result.filter((b) => b.difficulty >= difficultyFilter.min && b.difficulty <= effectiveMax);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q !== "") {
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.artist.toLowerCase().includes(q) ||
          b.creator.toLowerCase().includes(q),
      );
    }
    return result;
  }, [beatmaps, searchQuery, difficultyFilter, dailyScopeIds]);

  const isNoMatch = filteredBeatmaps.length === 0 && beatmaps.length > 0;

  return {
    beatmaps,
    filteredBeatmaps,
    isNoMatch,
    isLoaded,
  };
}
