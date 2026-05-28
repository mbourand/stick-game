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
  BUTTON_WIDTH_PX,
  CIRCLE_RADIUS_PX,
  getVisibleIndexRange,
  VERTICAL_PITCH_PX,
} from "./layout";

const CIRCLE_DIAMETER = CIRCLE_RADIUS_PX * 2;
const BUTTON_RETRACT_X = -260;
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

  useEffect(() => {
    selectionScene.setBeatmapCount(beatmaps.length);
  }, [beatmaps, selectionScene]);

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
      const beatmap = beatmaps[index];
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
  }, [beatmaps, resolveMediaUrls, selectionScene]);

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

  // Re-render the virtualization window only when the integer scroll bucket
  // changes. Continuous motion in between is driven directly via DOM writes
  // (see the useFrame below).
  const [windowBucket, setWindowBucket] = useState(() => Math.floor(selectionScene.getScrollOffset()));
  useFrame(() => {
    const bucket = Math.floor(selectionScene.getScrollOffset());
    if (bucket !== windowBucket) setWindowBucket(bucket);
  });

  const { firstIndex, lastIndex } = useMemo(
    () => getVisibleIndexRange(windowBucket, beatmaps.length),
    [windowBucket, beatmaps.length],
  );

  const visible = useMemo(() => {
    const out: { index: number; beatmap: V3BeatmapEntity }[] = [];
    for (let i = firstIndex; i <= lastIndex; i++) {
      const beatmap = beatmaps[i];
      if (beatmap) out.push({ index: i, beatmap });
    }
    return out;
  }, [firstIndex, lastIndex, beatmaps]);

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

  const focusedBeatmap = focusedIndex !== null ? beatmaps[focusedIndex] ?? null : null;

  useEffect(() => {
    if (!focusedBeatmap) {
      selectionScene.setFocusedBeatmapMedia(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const urls = await resolveMediaUrls(focusedBeatmap);
      if (cancelled || !urls) return;
      selectionScene.setFocusedBeatmapMedia(urls);
    })();
    return () => {
      cancelled = true;
    };
  }, [focusedBeatmap, resolveMediaUrls, selectionScene]);

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

        {beatmaps.length === 0 && (
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

      <AnimatePresence>
        {isVisible && focusedBeatmap && (
          <motion.div
            key={focusedBeatmap.idv2}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-auto"
          >
            <MapLeaderboard beatmapId={focusedBeatmap.idv2} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className="absolute top-6 right-6 pointer-events-auto text-xs uppercase tracking-[0.25em] px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded"
        initial={false}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: PHASE_DURATION_S }}
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
    <motion.button
      type="button"
      data-index={index}
      className={`absolute pointer-events-auto text-white text-left rounded-r-full flex items-center justify-between gap-4 transition-colors ${
        isFocused ? "bg-white/25" : "bg-white/10"
      }`}
      style={{
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
