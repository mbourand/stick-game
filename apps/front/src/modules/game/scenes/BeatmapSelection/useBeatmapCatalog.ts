"use client";

import { useCallback, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DIFFICULTY_SLIDER_MAX,
  type DifficultyFilter,
} from "@/app/game/_components/BeatmapFilters";
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

  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;

  difficultyFilter: DifficultyFilter | null;
  setDifficultyFilter: Dispatch<SetStateAction<DifficultyFilter | null>>;

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

export function useBeatmapCatalog(): BeatmapCatalog {
  const beatmaps: V3BeatmapEntity[] = useLiveQuery(
    () => latestDb.beatmaps.toArray().then((maps) => maps.sort((a, b) => b.difficulty - a.difficulty)),
    [],
    [] as V3BeatmapEntity[],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter | null>(null);

  const filteredBeatmaps = useMemo(() => {
    let result = beatmaps;
    if (difficultyFilter !== null) {
      // Slider parked at the max means "no upper bound" — keep maps above the slider range.
      const effectiveMax =
        difficultyFilter.max >= DIFFICULTY_SLIDER_MAX ? Infinity : difficultyFilter.max;
      result = result.filter(
        (b) => b.difficulty >= difficultyFilter.min && b.difficulty <= effectiveMax,
      );
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

  const urlCacheRef = useRef<LruCache<string, MediaUrls>>(
    new LruCache(MEDIA_URL_CACHE_SIZE, revokeMediaUrls),
  );
  const resolveMediaUrls = useCallback(
    async (beatmap: V3BeatmapEntity): Promise<MediaUrls | null> => {
      const cache = urlCacheRef.current;
      const cached = cache.get(beatmap.idv2);
      if (cached) return cached;
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
    },
    [],
  );

  return {
    beatmaps,
    filteredBeatmaps,
    isNoMatch,
    searchQuery,
    setSearchQuery,
    difficultyFilter,
    setDifficultyFilter,
    resolveMediaUrls,
  };
}
