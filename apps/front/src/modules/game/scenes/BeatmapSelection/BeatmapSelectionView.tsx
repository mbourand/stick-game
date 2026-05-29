"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent } from "motion/react";
import { useLiveQuery } from "dexie-react-hooks";
import { MapLeaderboard } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import { BeatmapsetDownloader } from "@/app/game/_components/BeatmapsetDownloader";
import {
  BeatmapFilters,
  DIFFICULTY_SLIDER_MAX,
  type DifficultyFilter,
} from "@/app/game/_components/BeatmapFilters";
import { latestDb } from "@/modules/db/db";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { convertFromOsu } from "../../../osu/convert/OsuConverter";
import {
  useScenePresence,
  useScenePresenceMotion,
} from "../../engine/animation/scenePresence";
import { useStore } from "../../engine/state/useStore";
import { LruCache } from "../../utils/LruCache";
import type { SceneUIComponent } from "../Scene";
import { BeatmapRadialButton } from "./BeatmapRadialButton";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";
import { LeftActionButton } from "./LeftActionButton";
import { ScrollSurface } from "./ScrollSurface";
import { useGlobalTypeahead } from "./useGlobalTypeahead";
import {
  BUTTON_WIDTH_PX,
  CIRCLE_RADIUS_PX,
  getLeftButtonYCenter,
  getVisibleIndexRange,
  RADIAL_LIST_MASK,
} from "./layout";

const CIRCLE_DIAMETER = CIRCLE_RADIUS_PX * 2;
const MEDIA_URL_CACHE_SIZE = 10;

type MediaUrls = { audioUrl: string; backgroundUrl: string };

const revokeMediaUrls = ({ audioUrl, backgroundUrl }: MediaUrls) => {
  URL.revokeObjectURL(audioUrl);
  URL.revokeObjectURL(backgroundUrl);
};

export const BeatmapSelectionView: SceneUIComponent<BeatmapSelectionScene> = ({ scene }) => {
  const isVisible = useScenePresence() === "in";
  const searchBarMotion = useScenePresenceMotion({ y: -12 });
  const emptyStateMotion = useScenePresenceMotion();

  const beatmaps: V3BeatmapEntity[] = useLiveQuery(
    () => latestDb.beatmaps.toArray().then((maps) => maps.sort((a, b) => b.difficulty - a.difficulty)),
    [],
    [] as V3BeatmapEntity[],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter | null>(null);
  const [isDownloaderOpen, setDownloaderOpen] = useState(false);
  const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);
  const isModalOpen = isDownloaderOpen || isFilterPanelOpen;

  const filteredBeatmaps = useMemo(() => {
    let result = beatmaps;
    if (difficultyFilter !== null) {
      // Slider parked at the maximum means "no upper bound" — keep maps that
      // exceed the slider range.
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

  useGlobalTypeahead(setSearchQuery, { disabled: isModalOpen });

  // Bounded LRU of blob URLs keyed by beatmap id. Intentionally NOT cleared
  // on unmount — the just-confirmed map's URLs need to survive until
  // GameplayScene.onEntered consumes them post-transition.
  const urlCacheRef = useRef<LruCache<string, MediaUrls>>(
    new LruCache(MEDIA_URL_CACHE_SIZE, revokeMediaUrls),
  );
  const resolveMediaUrls = useCallback(async (beatmap: V3BeatmapEntity): Promise<MediaUrls | null> => {
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
  }, []);

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

  const focusedIndex = useStore(scene.focusedIndex);
  const scrollZone = useStore(scene.scrollZone);
  const leaderboardTab = useStore(scene.leaderboardTab);
  const focusedLeftButton = useStore(scene.focusedLeftButton);

  // Re-render the virtualization window only when the integer scroll bucket
  // changes. Continuous motion in between is driven by each button's own
  // useTransform on scene.scrollOffset — no React render per frame.
  const [windowBucket, setWindowBucket] = useState(
    () => Math.floor(scene.scrollOffset.get()),
  );
  useMotionValueEvent(scene.scrollOffset, "change", (latest) => {
    const bucket = Math.floor(latest);
    setWindowBucket((prev) => (prev === bucket ? prev : bucket));
  });

  const { firstIndex, lastIndex } = useMemo(
    () => getVisibleIndexRange(windowBucket, filteredBeatmaps.length),
    [windowBucket, filteredBeatmaps.length],
  );

  const visible = useMemo(() => {
    const out: { index: number; beatmap: V3BeatmapEntity }[] = [];
    for (let i = firstIndex; i <= lastIndex; i++) {
      const beatmap = filteredBeatmaps[i];
      if (beatmap) out.push({ index: i, beatmap });
    }
    return out;
  }, [firstIndex, lastIndex, filteredBeatmaps]);

  const focusedBeatmap = focusedIndex !== null ? filteredBeatmaps[focusedIndex] ?? null : null;

  // Remember the focused beatmap by id across filter changes.
  const focusedBeatmapIdRef = useRef<string | null>(null);

  // "No match" is when the user has typed a query but it filtered everything
  // out. We keep the existing preview alive in that case — the user is
  // mid-search, they don't want their playing track or background torn down.
  const isNoMatch = filteredBeatmaps.length === 0 && beatmaps.length > 0;

  // Sync count + reconcile focus whenever the filtered list changes. We try
  // to preserve focus on the same beatmap; if it's no longer in the result
  // set, snap to the first match. If no focus was ever set (initial mount),
  // we leave the scene's random-pick alone. If the filter currently matches
  // nothing, we skip entirely so the previous focus + preview stay put.
  useEffect(() => {
    if (isNoMatch) return;
    scene.setBeatmapCount(filteredBeatmaps.length);
    if (filteredBeatmaps.length === 0) {
      scene.focusedIndex.set(null);
      return;
    }
    const remembered = focusedBeatmapIdRef.current;
    if (remembered === null) return;
    const newIndex = filteredBeatmaps.findIndex((b) => b.idv2 === remembered);
    const target = newIndex >= 0 ? newIndex : 0;
    scene.focusedIndex.set(target);
    scene.scrollTo(target);
  }, [filteredBeatmaps, scene, isNoMatch]);

  // Keep the remembered id in sync with the actual focus. Declared AFTER the
  // reconciliation so that, on filter changes, reconciliation runs first and
  // gets to read the prior id before it's overwritten.
  useEffect(() => {
    if (focusedIndex === null) return;
    const beatmap = filteredBeatmaps[focusedIndex];
    if (beatmap) focusedBeatmapIdRef.current = beatmap.idv2;
  }, [focusedIndex, filteredBeatmaps]);

  // The beatmap whose audio/background/leaderboard is currently on display.
  // Sticks to the last non-null focused beatmap — this is what keeps the
  // preview alive when the filter wipes the list (focusedBeatmap goes null,
  // but the previewBeatmap from the prior render is held).
  const [previewBeatmap, setPreviewBeatmap] = useState<V3BeatmapEntity | null>(null);
  if (focusedBeatmap !== null && focusedBeatmap !== previewBeatmap) {
    setPreviewBeatmap(focusedBeatmap);
  }

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

  const leftButtons = useMemo<{ id: string; label: string; onActivate: () => void }[]>(
    () => [
      { id: "filter", label: "Filters", onActivate: () => setFilterPanelOpen(true) },
      { id: "download", label: "Download maps", onActivate: () => setDownloaderOpen(true) },
    ],
    [setFilterPanelOpen, setDownloaderOpen],
  );

  // Push everything the scene needs to know about UI-owned input routing in
  // one shot: which modal is open (blocks gamepad nav + confirm), how `back`
  // should behave (close the modal vs. pop the scene), and the left-column
  // actions (count for stick picking, onConfirm for activation).
  useEffect(() => {
    scene.setUIContext({
      blocked: isModalOpen,
      backHandler: isModalOpen
        ? () => {
            if (isFilterPanelOpen) setFilterPanelOpen(false);
            else if (isDownloaderOpen) setDownloaderOpen(false);
          }
        : null,
      leftActions: {
        count: leftButtons.length,
        onConfirm: (index) => leftButtons[index]?.onActivate(),
      },
    });
    return () => scene.resetUIContext();
  }, [isModalOpen, isFilterPanelOpen, isDownloaderOpen, leftButtons, scene]);

  return (
    <div className="absolute inset-0 text-white select-none" style={{ fontFamily: "Rostex" }}>
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: `${CIRCLE_DIAMETER}px`,
          height: `${CIRCLE_DIAMETER}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className="absolute overflow-hidden"
          style={{
            top: 0,
            bottom: 0,
            left: 0,
            right: -BUTTON_WIDTH_PX,
            maskImage: RADIAL_LIST_MASK,
            WebkitMaskImage: RADIAL_LIST_MASK,
          }}
        >
          {visible.map(({ index, beatmap }) => (
            <BeatmapRadialButton
              key={beatmap.idv2}
              index={index}
              scrollOffset={scene.scrollOffset}
              staggerSlot={index - firstIndex}
              title={beatmap.title}
              artist={beatmap.artist}
              creator={beatmap.creator}
              difficulty={beatmap.difficulty}
              isFocused={focusedIndex === index}
              onFocus={() => {
                scene.focusedLeftButton.set(null);
                scene.focusedIndex.set(index);
              }}
              onClick={() => {
                scene.focusedLeftButton.set(null);
                scene.focusedIndex.set(index);
                void scene.confirmFocused();
              }}
            />
          ))}
        </div>

        {/* Left-side action buttons — mirror of the beatmap buttons. */}
        {leftButtons.map((btn, index) => (
          <LeftActionButton
            key={btn.id}
            yCenter={getLeftButtonYCenter(index, leftButtons.length)}
            label={btn.label}
            isFocused={focusedLeftButton === index}
            onFocus={() => {
              scene.focusedIndex.set(null);
              scene.focusedLeftButton.set(index);
            }}
            onClick={() => {
              scene.focusedIndex.set(null);
              scene.focusedLeftButton.set(index);
              btn.onActivate();
            }}
          />
        ))}

        <ScrollSurface
          position="top"
          active={scrollZone === "top"}
          onPress={() => scene.scrollBy(-3)}
        />
        <ScrollSurface
          position="bottom"
          active={scrollZone === "bottom"}
          onPress={() => scene.scrollBy(+3)}
        />

        {/* Search bar — top of the circle. */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: "80px", width: "400px" }}
          {...searchBarMotion}
        >
          <input
            type="text"
            placeholder="Search title, artist, mapper…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/30 backdrop-blur-sm border border-white/20 text-white text-xs tracking-[0.15em] uppercase placeholder-white/40 px-4 py-2 rounded focus:bg-black/50 focus:border-white/60 outline-none text-center"
          />
          {isNoMatch && (
            <div className="mt-2 text-center text-[10px] tracking-[0.25em] uppercase text-white/50">
              No matches
            </div>
          )}
        </motion.div>

        {/* Map info — upper middle. */}
        <AnimatePresence mode="wait">
          {isVisible && previewBeatmap && (
            <motion.div
              key={previewBeatmap.idv2 + ":info"}
              className="absolute left-1/2 -translate-x-1/2 pointer-events-none text-center"
              style={{ top: "180px", width: "640px" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-2xl font-semibold tracking-[0.15em] uppercase truncate text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                {previewBeatmap.title}
              </div>
              <div className="mt-1 text-xs tracking-[0.2em] uppercase text-white/70 truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                {previewBeatmap.artist}
                <span className="text-white/40"> · mapped by </span>
                {previewBeatmap.creator}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                <span className="text-white/70 text-xs">★</span>
                <span className="text-white font-bold tabular-nums text-sm">
                  {previewBeatmap.difficulty.toFixed(2)}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard — bottom of the circle. */}
        <AnimatePresence mode="wait">
          {isVisible && previewBeatmap && (
            <motion.div
              key={previewBeatmap.idv2 + ":leaderboard"}
              className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
              style={{ bottom: "80px", width: "480px" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
            >
              <MapLeaderboard beatmapId={previewBeatmap.idv2} tab={leaderboardTab} />
            </motion.div>
          )}
        </AnimatePresence>

        {filteredBeatmaps.length === 0 && beatmaps.length === 0 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center text-white/60 text-sm tracking-[0.25em] uppercase pointer-events-none text-center"
            {...emptyStateMotion}
          >
            No beatmaps yet — download some!
          </motion.div>
        )}
      </div>

      <BeatmapsetDownloader isVisible={isDownloaderOpen} onClose={() => setDownloaderOpen(false)} />
      <BeatmapFilters
        isVisible={isFilterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        difficultyFilter={difficultyFilter}
        onDifficultyChange={setDifficultyFilter}
      />
    </div>
  );
};
