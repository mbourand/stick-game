"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MapLeaderboard } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import { BeatmapsetDownloader } from "@/app/game/_components/BeatmapsetDownloader";
import { BeatmapFilters } from "@/app/game/_components/BeatmapFilters";
import { useScenePresence } from "../../engine/animation/scenePresence";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import type { SceneUIComponent } from "../Scene";
import { BeatmapRadialButton } from "./BeatmapRadialButton";
import type {
  BeatmapSelectionScene,
  BeatmapSelectionUIContext,
} from "./BeatmapSelectionScene";
import { LeftActionButton } from "./LeftActionButton";
import { ScrollSurface } from "./ScrollSurface";
import { useGlobalTypeahead } from "./useGlobalTypeahead";
import {
  BUTTON_WIDTH_PX,
  CIRCLE_RADIUS_PX,
  getLeftButtonYCenter,
  RADIAL_LIST_MASK,
} from "./layout";
import { useBeatmapCatalog } from "./useBeatmapCatalog";
import { useBeatmapModals } from "./useBeatmapModals";
import { usePreviewBeatmap } from "./usePreviewBeatmap";
import { useSceneFocusSync } from "./useSceneFocusSync";
import { useScenePreviewBridge } from "./useScenePreviewBridge";
import { useSceneResolverBridge } from "./useSceneResolverBridge";
import { useSceneUIContext } from "./useSceneUIContext";
import { useVisibleBeatmaps } from "./useVisibleBeatmaps";

const CIRCLE_DIAMETER = CIRCLE_RADIUS_PX * 2;

export const BeatmapSelectionView: SceneUIComponent<BeatmapSelectionScene> = ({ scene }) => {
  const isVisible = useScenePresence() === "in";
  const searchBarMotion = useScenePresenceMotion({ y: -12 });
  const emptyStateMotion = useScenePresenceMotion();

  const searchQuery = useStore(scene.searchQuery);
  const difficultyFilter = useStore(scene.difficultyFilter);
  const { beatmaps, filteredBeatmaps, isNoMatch, isLoaded, resolveMediaUrls } = useBeatmapCatalog(
    searchQuery,
    difficultyFilter,
  );

  const {
    isFilterPanelOpen,
    setFilterPanelOpen,
    isDownloaderOpen,
    setDownloaderOpen,
    isAnyOpen: isModalOpen,
    closeTop: closeTopModal,
  } = useBeatmapModals();

  useGlobalTypeahead(scene.searchQuery.update, { disabled: isModalOpen });

  const leftButtons = useMemo<{ id: string; label: string; onActivate: () => void }[]>(
    () => [
      { id: "filter", label: "Filters", onActivate: () => setFilterPanelOpen(true) },
      { id: "download", label: "Download maps", onActivate: () => setDownloaderOpen(true) },
    ],
    [setFilterPanelOpen, setDownloaderOpen],
  );

  useSceneResolverBridge(scene, filteredBeatmaps, resolveMediaUrls);
  const { focusedIndex, focusedBeatmap } = useSceneFocusSync(scene, filteredBeatmaps, isNoMatch, isLoaded);
  const previewBeatmap = usePreviewBeatmap(focusedBeatmap);
  useScenePreviewBridge(scene, previewBeatmap, resolveMediaUrls);

  const uiContext = useMemo<BeatmapSelectionUIContext>(
    () => ({
      blocked: isModalOpen,
      backHandler: isModalOpen ? closeTopModal : null,
      leftActions: {
        count: leftButtons.length,
        onConfirm: (index) => leftButtons[index]?.onActivate(),
      },
    }),
    [isModalOpen, closeTopModal, leftButtons],
  );
  useSceneUIContext(scene, uiContext);

  const scrollZone = useStore(scene.scrollZone);
  const leaderboardTab = useStore(scene.leaderboardTab);
  const focusedLeftButton = useStore(scene.focusedLeftButton);
  const visible = useVisibleBeatmaps(scene.scrollOffset, filteredBeatmaps);

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
          {visible.map(({ index, beatmap, staggerSlot }) => (
            <BeatmapRadialButton
              key={beatmap.idv2}
              index={index}
              scrollOffset={scene.scrollOffset}
              staggerSlot={staggerSlot}
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

        <motion.div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: "80px", width: "400px" }}
          {...searchBarMotion}
        >
          <input
            type="text"
            placeholder="Search title, artist, mapper…"
            value={searchQuery}
            onChange={(e) => scene.searchQuery.set(e.target.value)}
            className="w-full bg-black/30 backdrop-blur-sm border border-white/20 text-white text-xs tracking-[0.15em] uppercase placeholder-white/40 px-4 py-2 rounded focus:bg-black/50 focus:border-white/60 outline-none text-center"
          />
          {isNoMatch && (
            <div className="mt-2 text-center text-[10px] tracking-[0.25em] uppercase text-white/50">
              No matches
            </div>
          )}
        </motion.div>

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
        onDifficultyChange={scene.difficultyFilter.set}
      />
    </div>
  );
};
