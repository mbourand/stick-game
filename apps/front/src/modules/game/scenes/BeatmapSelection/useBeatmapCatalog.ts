"use client";

import { useCallback, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { DIFFICULTY_SLIDER_MAX, type DifficultyFilter } from "../Filter/filterTypes";
import { latestDb } from "@/modules/db/db";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { LruCache } from "../../utils/LruCache";

export type MediaUrls = { audioUrl: string; backgroundUrl: string };

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

  /**
   * Resolves audio + background blob URLs for a beatmap, backed by an LRU
   * cache. Cache lives in a ref and is intentionally NOT cleared on unmount
   * — the just-confirmed map's URLs need to survive until GameplayScene
   * consumes them post-transition.
   */
  resolveMediaUrls: (beatmap: V3BeatmapEntity) => Promise<MediaUrls | null>;
};

const MEDIA_URL_CACHE_SIZE = 10;

const revokeMediaUrls = ({ audioUrl, backgroundUrl }: MediaUrls) => {
  URL.revokeObjectURL(audioUrl);
  URL.revokeObjectURL(backgroundUrl);
};

/**
 * Filter inputs are passed in (not held inside) so the view can source them
 * from a scene-owned Store and keep them alive while the view unmounts.
 */
export function useBeatmapCatalog(searchQuery: string, difficultyFilter: DifficultyFilter | null): BeatmapCatalog {
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
  }, [beatmaps, searchQuery, difficultyFilter]);

  const isNoMatch = filteredBeatmaps.length === 0 && beatmaps.length > 0;

  const urlCacheRef = useRef<LruCache<string, MediaUrls>>(new LruCache(MEDIA_URL_CACHE_SIZE, revokeMediaUrls));
  const resolveMediaUrls = useCallback(async (beatmap: V3BeatmapEntity): Promise<MediaUrls | null> => {
    const cache = urlCacheRef.current;
    const cached = cache.get(beatmap.idv2);
    if (cached) return cached;
    // Legacy beatmaps in the DB may have null ids if the downloader couldn't
    // find the referenced audio/background file in the zip. Skip cleanly
    // instead of letting Dexie throw on Table.get(invalid).
    if (beatmap.audioId == null || beatmap.gameplayBackgroundId == null) return null;
    const [audioFile, bgFile] = await Promise.all([
      latestDb.files.get(beatmap.audioId),
      latestDb.files.get(beatmap.gameplayBackgroundId),
    ]);
    if (!audioFile || !bgFile) return null;
    const urls: MediaUrls = {
      audioUrl: URL.createObjectURL(audioFile.content),
      backgroundUrl: URL.createObjectURL(bgFile.content),
    };
    cache.set(beatmap.idv2, urls);
    return urls;
  }, []);

  return {
    beatmaps,
    filteredBeatmaps,
    isNoMatch,
    isLoaded,
    resolveMediaUrls,
  };
}
