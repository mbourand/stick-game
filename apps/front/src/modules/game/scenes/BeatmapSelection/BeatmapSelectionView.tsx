"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLiveQuery } from "dexie-react-hooks";
import { MapLeaderboard } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import { BeatmapsetDownloader } from "@/app/game/_components/BeatmapsetDownloader";
import { latestDb } from "@/modules/db/db";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { convertFromOsu } from "../../../osu/convert/OsuConverter";
import { useFrame } from "../../engine/useFrame";
import type { SceneUIComponent } from "../Scene";
import { useScenePhase } from "../useScene";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";
import {
  applyRadialLayout,
  BUTTON_HEIGHT_PX,
  BUTTON_RETRACT_X,
  BUTTON_WIDTH_PX,
  CIRCLE_RADIUS_PX,
  getVisibleIndexRange,
  OUTER_LEFT_EXTRA_PX,
  VERTICAL_PITCH_PX,
} from "./layout";

const CIRCLE_DIAMETER = CIRCLE_RADIUS_PX * 2;
const BUTTON_STAGGER_S = 0.025;
const PHASE_DURATION_S = 0.32;
const MEDIA_URL_CACHE_SIZE = 10;

export const BeatmapSelectionView: SceneUIComponent = ({ scene }) => {
  const selectionScene = scene as BeatmapSelectionScene;
  const phase = useScenePhase(scene);
  const isVisible = phase === "active" || phase === "entering";

  const beatmaps: V3BeatmapEntity[] = useLiveQuery(
    () => latestDb.beatmaps.toArray().then((maps) => maps.sort((a, b) => b.difficulty - a.difficulty)),
    [],
    [] as V3BeatmapEntity[],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const filteredBeatmaps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q === "") return beatmaps;
    return beatmaps.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.artist.toLowerCase().includes(q) ||
        b.creator.toLowerCase().includes(q),
    );
  }, [beatmaps, searchQuery]);

  // Game is played on a controller, so users won't usually have the search
  // input focused. Funnel global keystrokes into the query — unless another
  // input/textarea is already focused (so the input itself still works
  // normally when clicked).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Backspace") {
        setSearchQuery((q) => q.slice(0, -1));
        e.preventDefault();
      } else if (e.key === "Escape") {
        setSearchQuery("");
        e.preventDefault();
      } else if (e.key.length === 1) {
        setSearchQuery((q) => q + e.key);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // LRU cache of blob URLs keyed by beatmap id. Bounded so memory doesn't
  // grow without limit as the user browses, and intentionally NOT cleared on
  // unmount — the just-confirmed map's URLs need to survive until
  // GameplayScene.onEntered consumes them post-transition.
  const urlCacheRef = useRef<Map<string, { audioUrl: string; backgroundUrl: string }>>(new Map());
  const resolveMediaUrls = useCallback(async (beatmap: V3BeatmapEntity) => {
    const cache = urlCacheRef.current;
    const cached = cache.get(beatmap.idv2);
    if (cached) {
      cache.delete(beatmap.idv2);
      cache.set(beatmap.idv2, cached);
      return cached;
    }
    const [audioFile, bgFile] = await Promise.all([
      latestDb.files.get(beatmap.audioId),
      latestDb.files.get(beatmap.gameplayBackgroundId),
    ]);
    if (!audioFile || !bgFile) return null;
    const urls = {
      audioUrl: URL.createObjectURL(audioFile.content),
      backgroundUrl: URL.createObjectURL(bgFile.content),
    };
    cache.set(beatmap.idv2, urls);
    while (cache.size > MEDIA_URL_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey === undefined) break;
      const evicted = cache.get(oldestKey)!;
      URL.revokeObjectURL(evicted.audioUrl);
      URL.revokeObjectURL(evicted.backgroundUrl);
      cache.delete(oldestKey);
    }
    return urls;
  }, []);

  useEffect(() => {
    selectionScene.setBeatmapResolver(async (index) => {
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
    return () => selectionScene.setBeatmapResolver(null);
  }, [filteredBeatmaps, resolveMediaUrls, selectionScene]);

  const focusedIndex = useSyncExternalStore(
    selectionScene.subscribe,
    selectionScene.getFocusedIndex,
    selectionScene.getFocusedIndex,
  );
  const scrollZone = useSyncExternalStore(
    selectionScene.subscribe,
    selectionScene.getScrollZone,
    selectionScene.getScrollZone,
  );
  const leaderboardTab = useSyncExternalStore(
    selectionScene.subscribe,
    selectionScene.getLeaderboardTab,
    selectionScene.getLeaderboardTab,
  );

  // Re-render the virtualization window only when the integer scroll bucket
  // changes. Continuous motion in between is driven directly via DOM writes
  // (see the useFrame below).
  const [windowBucket, setWindowBucket] = useState(() => Math.floor(selectionScene.getScrollOffset()));
  useFrame(() => {
    const bucket = Math.floor(selectionScene.getScrollOffset());
    if (bucket !== windowBucket) setWindowBucket(bucket);
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

  // Per-frame DOM writes: position + mask each visible button along the curve.
  const listRef = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const list = listRef.current;
    if (!list) return;
    const offset = selectionScene.getScrollOffset();
    const r = CIRCLE_RADIUS_PX;
    for (const child of Array.from(list.children) as HTMLElement[]) {
      const idx = Number(child.dataset.index);
      if (Number.isNaN(idx)) continue;
      applyRadialLayout(child, (idx - offset) * VERTICAL_PITCH_PX, r);
    }
  });

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
    selectionScene.setBeatmapCount(filteredBeatmaps.length);
    if (filteredBeatmaps.length === 0) {
      selectionScene.setFocused(null);
      return;
    }
    const remembered = focusedBeatmapIdRef.current;
    if (remembered === null) return;
    const newIndex = filteredBeatmaps.findIndex((b) => b.idv2 === remembered);
    const target = newIndex >= 0 ? newIndex : 0;
    selectionScene.setFocused(target);
    selectionScene.scrollTo(target);
  }, [filteredBeatmaps, selectionScene, isNoMatch]);

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
      selectionScene.setFocusedBeatmapMedia(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const urls = await resolveMediaUrls(previewBeatmap);
      if (cancelled || !urls) return;
      selectionScene.setFocusedBeatmapMedia(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [previewBeatmap, resolveMediaUrls, selectionScene]);

  const [isDownloaderOpen, setDownloaderOpen] = useState(false);

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
        <div ref={listRef} className="absolute inset-0">
          {visible.map(({ index, beatmap }) => (
            <BeatmapRadialButton
              key={beatmap.idv2}
              index={index}
              staggerSlot={index - firstIndex}
              title={beatmap.title}
              artist={beatmap.artist}
              creator={beatmap.creator}
              difficulty={beatmap.difficulty}
              isFocused={focusedIndex === index}
              isVisible={isVisible}
              onFocus={() => selectionScene.setFocused(index)}
              onClick={() => {
                selectionScene.setFocused(index);
                void selectionScene.confirmFocused();
              }}
            />
          ))}
        </div>

        <ScrollSurface
          position="top"
          active={scrollZone === "top"}
          isVisible={isVisible}
          onPress={() => selectionScene.scrollBy(-3)}
        />
        <ScrollSurface
          position="bottom"
          active={scrollZone === "bottom"}
          isVisible={isVisible}
          onPress={() => selectionScene.scrollBy(+3)}
        />

        {/* Search bar — top of the circle. */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: "80px", width: "400px" }}
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -12 }}
          transition={{ duration: PHASE_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
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
            initial={false}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: PHASE_DURATION_S }}
          >
            No beatmaps yet — download some!
          </motion.div>
        )}
      </div>

      <motion.button
        type="button"
        className="absolute top-6 right-6 pointer-events-auto text-xs uppercase tracking-[0.25em] px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded whitespace-nowrap"
        initial={false}
        animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -12 }}
        transition={{ duration: PHASE_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
        onClick={() => setDownloaderOpen(true)}
      >
        Download maps
      </motion.button>
      <BeatmapsetDownloader isVisible={isDownloaderOpen} onClose={() => setDownloaderOpen(false)} />
    </div>
  );
};

type BeatmapRadialButtonProps = {
  index: number;
  staggerSlot: number;
  title: string;
  artist: string;
  creator: string;
  difficulty: number;
  isFocused: boolean;
  isVisible: boolean;
  onFocus: () => void;
  onClick: () => void;
};

const BeatmapRadialButton = ({
  index,
  staggerSlot,
  title,
  artist,
  creator,
  difficulty,
  isFocused,
  isVisible,
  onFocus,
  onClick,
}: BeatmapRadialButtonProps) => {
  return (
    <div
      data-index={index}
      className="absolute"
      style={{
        width: `${BUTTON_WIDTH_PX + OUTER_LEFT_EXTRA_PX}px`,
        height: `${BUTTON_HEIGHT_PX}px`,
      }}
    >
      <motion.button
        type="button"
        className={`absolute pointer-events-auto text-white text-left rounded-r-full flex items-center justify-between gap-4 transition-colors ${
          isFocused ? "bg-white/25" : "bg-white/10"
        }`}
        style={{
          right: 0,
          top: 0,
          width: `${BUTTON_WIDTH_PX}px`,
          height: `${BUTTON_HEIGHT_PX}px`,
          paddingRight: "32px",
          border: "2px solid rgba(255,255,255,0.5)",
        }}
        initial={false}
        animate={{
          x: isVisible ? 0 : BUTTON_RETRACT_X,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          duration: PHASE_DURATION_S,
          ease: [0.4, 0, 0.2, 1],
          delay: isVisible ? Math.max(0, staggerSlot) * BUTTON_STAGGER_S : 0,
        }}
        onMouseEnter={onFocus}
        onFocus={onFocus}
        onClick={onClick}
      >
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-lg font-semibold tracking-widest uppercase truncate">{title}</span>
          <span className="text-xs text-white/60 tracking-[0.15em] truncate">
            {artist} · mapped by {creator}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-bold tabular-nums">{difficulty.toFixed(1)}</span>
          <span className="text-xs text-white/60 uppercase tracking-[0.2em]">★</span>
        </div>
      </motion.button>
    </div>
  );
};

type ScrollSurfaceProps = {
  position: "top" | "bottom";
  active: boolean;
  isVisible: boolean;
  onPress: () => void;
};

const ScrollSurface = ({ position, active, isVisible, onPress }: ScrollSurfaceProps) => {
  const isTop = position === "top";
  return (
    <motion.button
      type="button"
      aria-label={isTop ? "Scroll up" : "Scroll down"}
      className={`absolute pointer-events-auto left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full border transition-colors ${
        active ? "bg-white/25 border-white/70" : "bg-white/5 border-white/20 hover:bg-white/15"
      }`}
      style={{
        width: 96,
        height: 36,
        [isTop ? "top" : "bottom"]: -24,
      }}
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : isTop ? -12 : 12,
      }}
      transition={{ duration: PHASE_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
      onClick={onPress}
    >
      <span className="text-white/80 text-lg leading-none" aria-hidden>
        {isTop ? "▲" : "▼"}
      </span>
    </motion.button>
  );
};
