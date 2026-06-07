import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { MapLeaderboard } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import { useScenePresence } from "../../engine/animation/scenePresence";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useDebouncedValue } from "../../engine/state/useDebouncedValue";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import type { SceneUIComponent } from "../Scene";
import { difficultyColor, difficultyColorRgba } from "../shared/difficultyColor";
import { BeatmapRadialButton } from "./BeatmapRadialButton";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";
import { DailyPanel } from "./DailyPanel";
import { LeftActionButton } from "./LeftActionButton";
import { ScrollSurface } from "./ScrollSurface";
import { useGlobalTypeahead } from "./useGlobalTypeahead";
import { CIRCLE_RADIUS_PX, getLeftButtonYCenter, LIST_RIGHT_OVERHANG_PX, RADIAL_LIST_MASK } from "./layout";
import { useBeatmapCatalog } from "./useBeatmapCatalog";
import { usePreviewBeatmap } from "./usePreviewBeatmap";
import { usePreviewDuration } from "./usePreviewDuration";
import { useSceneFocusSync } from "./useSceneFocusSync";
import { useScenePreviewBridge } from "./useScenePreviewBridge";
import { useSceneResolverBridge } from "./useSceneResolverBridge";
import { useVisibleBeatmaps } from "./useVisibleBeatmaps";

const CIRCLE_DIAMETER = CIRCLE_RADIUS_PX * 2;

export const BeatmapSelectionView: SceneUIComponent<BeatmapSelectionScene> = ({ scene }) => {
  const isVisible = useScenePresence() === "in";
  const { scale } = useViewport();
  const searchBarMotion = useScenePresenceMotion(fade({ y: -12 }));
  const emptyStateMotion = useScenePresenceMotion(fade());

  const searchQuery = useStore(scene.searchQuery);
  const difficultyFilter = useStore(scene.difficultyFilter);
  const dailyScopeIds = useStore(scene.dailyScopeBeatmapIds);
  const { beatmaps, filteredBeatmaps, isNoMatch, isLoaded } = useBeatmapCatalog(
    searchQuery,
    difficultyFilter,
    dailyScopeIds,
  );

  // Set of installed idv2 keys — lets the DailyPanel tell "owned" from "needs download".
  const installedIdv2s = useMemo(() => new Set(beatmaps.map((b) => b.idv2)), [beatmaps]);

  useGlobalTypeahead(scene.searchQuery.update);

  // The cache backing resolveMediaUrls lives on the scene — taking the method
  // from there (rather than from a view-local hook) is what lets the URLs
  // survive view remounts on overlay close. Memoise the bound reference so
  // the bridges' effect deps don't churn on every render.
  const resolveMediaUrls = useMemo(() => scene.resolveMediaUrls.bind(scene), [scene]);

  useSceneResolverBridge(scene, filteredBeatmaps, resolveMediaUrls);
  const { focusedIndex, focusedBeatmap } = useSceneFocusSync(scene, filteredBeatmaps, isNoMatch, isLoaded);
  const previewBeatmap = usePreviewBeatmap(focusedBeatmap);
  const previewDurationMs = usePreviewDuration(previewBeatmap);
  const previewDurationSeconds = previewDurationMs === null ? null : Math.round(previewDurationMs / 1000);
  const previewDurationLabel =
    previewDurationSeconds === null
      ? null
      : `${Math.floor(previewDurationSeconds / 60)}:${(previewDurationSeconds % 60).toString().padStart(2, "0")}`;
  // Gate the expensive preview side effects (audio restart + background
  // crossfade) on focus settling, so fast scrolling through maps doesn't fire
  // one per intermediate map. The info card / leaderboard keep tracking the
  // immediate `previewBeatmap` so the visible selection stays responsive.
  const debouncedPreviewBeatmap = useDebouncedValue(previewBeatmap, 50);
  useScenePreviewBridge(scene, debouncedPreviewBeatmap, resolveMediaUrls);

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
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <div
          className="absolute overflow-hidden"
          style={{
            top: 0,
            bottom: 0,
            left: 0,
            right: -LIST_RIGHT_OVERHANG_PX,
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
              // Hide beatmap focus while the left column is active so the two
              // focus states stay mutually exclusive *visually*, even though
              // focusedIndex is preserved underneath as "last focused".
              isFocused={focusedIndex === index && focusedLeftButton === null}
              // No onFocus: hovering a beatmap must not focus it (which would
              // restart the preview audio + background). A click both focuses
              // and launches the map.
              onClick={() => {
                scene.focusedLeftButton.set(null);
                scene.focusedIndex.set(index);
                void scene.confirmFocused();
              }}
            />
          ))}
        </div>

        {scene.leftActions.map((btn, index) =>
          btn.id === "daily" ? (
            <DailyPanel
              key={btn.id}
              scene={scene}
              index={index}
              yCenter={getLeftButtonYCenter(index, scene.leftActions.length)}
              isFocused={focusedLeftButton === index}
              installedIdv2s={installedIdv2s}
              scopeActive={dailyScopeIds !== null}
            />
          ) : (
            <LeftActionButton
              key={btn.id}
              yCenter={getLeftButtonYCenter(index, scene.leftActions.length)}
              label={btn.label}
              isFocused={focusedLeftButton === index}
              // No onFocus: hovering must not focus the button. A click focuses
              // it and runs the action. focusedIndex is intentionally NOT cleared
              // here — keeping it preserved is what lets the overlay close restore
              // the user to the beatmap they were on.
              onClick={() => {
                scene.focusedLeftButton.set(index);
                btn.onActivate();
              }}
            />
          ),
        )}

        <ScrollSurface position="top" active={scrollZone === "top"} onPress={() => scene.scrollBy(-3)} />
        <ScrollSurface position="bottom" active={scrollZone === "bottom"} onPress={() => scene.scrollBy(+3)} />

        <motion.div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto"
          style={{ top: "80px", width: "400px" }}
          {...searchBarMotion}
        >
          <input
            type="text"
            placeholder="Search title, artist, mapper…"
            value={searchQuery}
            onChange={(e) => {
              // Typing a search leaves the daily-only view back to the full library.
              if (scene.dailyScopeBeatmapIds.get() !== null) scene.clearDailyScope();
              scene.searchQuery.set(e.target.value);
            }}
            className="w-full bg-black/30 backdrop-blur-sm border border-white/20 text-white text-xs tracking-[0.15em] uppercase placeholder-white/40 px-4 py-2 rounded focus:bg-black/50 focus:border-white/60 outline-none text-center"
          />
          {isNoMatch && (
            <div className="mt-2 text-center text-[10px] tracking-[0.25em] uppercase text-white/50">No matches</div>
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
              <div className="mt-3 flex items-center justify-center gap-2">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm"
                  style={{
                    border: `1px solid ${difficultyColor(previewBeatmap.difficulty)}`,
                    boxShadow: `0 0 16px ${difficultyColorRgba(previewBeatmap.difficulty, 0.3)}`,
                  }}
                >
                  <span className="text-xs" style={{ color: difficultyColor(previewBeatmap.difficulty) }}>
                    ★
                  </span>
                  <span
                    className="font-bold tabular-nums text-sm"
                    style={{ color: difficultyColor(previewBeatmap.difficulty) }}
                  >
                    {previewBeatmap.difficulty.toFixed(2)}
                  </span>
                </div>
                {previewDurationLabel !== null && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white/80">
                    <span className="text-xs">◷</span>
                    <span className="font-bold tabular-nums text-sm">{previewDurationLabel}</span>
                  </div>
                )}
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
    </div>
  );
};
