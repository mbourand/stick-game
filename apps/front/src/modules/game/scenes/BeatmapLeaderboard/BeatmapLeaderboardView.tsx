import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { ScoreRow } from "@/app/game/_components/MapLeaderboard/ScoreRow";
import { SelfScoreRow } from "@/app/game/_components/MapLeaderboard/SelfScoreRow";
import { LEADERBOARD_TABS, type LeaderboardTab } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { HintBar } from "../shared/KeyHint";
import { difficultyColor } from "../shared/difficultyColor";
import type { SceneUIComponent } from "../Scene";
import type { BeatmapLeaderboardScene } from "./BeatmapLeaderboardScene";
import { ScorePodium } from "./ScorePodium";
import { useBeatmapLeaderboardRows, type LeaderboardRow } from "./useBeatmapLeaderboardRows";

// How far a board slides as it cross-fades when switching tabs. Kept under the
// panel's padding (p-7 = 28px) so the off-panel travel tucks into the padding —
// no overflow clip needed, which would otherwise crop the list vertically.
const SLIDE = 24;

/** Per-board label + accent for the tab strip. */
const TAB_META: Record<LeaderboardTab, { label: string; accent: string }> = {
  global: { label: "Global", accent: "#69b4ff" },
  modded: { label: "Modded", accent: "#ffb169" },
  local: { label: "Local", accent: "#7ee081" },
};

export const BeatmapLeaderboardView: SceneUIComponent<BeatmapLeaderboardScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));
  const hintMotion = useScenePresenceMotion(fade({ y: 12 }));
  const { scale } = useViewport();
  const tab = useStore(scene.tab);
  const selectedIndex = useStore(scene.selectedIndex);

  const { rows, isLoading, isError } = useBeatmapLeaderboardRows(scene.beatmapId, tab);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  // Keep the scene's cursor clamp in sync with the visible list length.
  useEffect(() => {
    scene.setListLength(rest.length);
  }, [rest.length, scene]);

  // Index (within the full board) of the just-played run to highlight — only set
  // when opened from the Scores screen; -1 from selection (highlight nothing) or
  // when the run isn't on this board.
  const current = scene.currentScore;
  const currentIndex = useMemo(() => {
    if (!current) return -1;
    if (tab === "local") {
      return current.localId == null ? -1 : rows.findIndex((row) => row.localId === current.localId);
    }
    // The run lives on exactly one global board (modded vs no-mods), and there as
    // the player's single personal-best row — match it by owner + score.
    if ((tab === "modded") !== current.modded) return -1;
    return rows.findIndex((row) => row.isSelf && row.score === current.score);
  }, [current, tab, rows]);

  // When the run is in the scrollable list (below the podium), park the cursor on
  // it so entering the tab scrolls it into view.
  useEffect(() => {
    if (currentIndex >= 3) scene.selectedIndex.set(currentIndex - 3);
  }, [tab, currentIndex, scene]);

  // Read at animation time so the *exiting* board uses the live direction too —
  // pressing right slides out left / in from right, left mirrors it.
  const boardVariants = {
    enter: () => ({ x: scene.tabDirection >= 0 ? SLIDE : -SLIDE, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: () => ({ x: scene.tabDirection >= 0 ? -SLIDE : SLIDE, opacity: 0 }),
  };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="w-[680px] h-[900px] flex flex-col text-white p-7 rounded-lg border border-white/10 bg-white/[0.02]"
          {...panelMotion}
        >
          <header className="border-b border-white/10 pb-4">
            <h1 className="text-center text-xl font-semibold tracking-[0.12em] uppercase truncate">{scene.title}</h1>
            <div className="mt-1.5 flex items-center justify-center gap-2 text-xs tracking-[0.2em] uppercase text-white/55">
              <span className="truncate max-w-[380px]">{scene.artist}</span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                style={{
                  border: `1px solid ${difficultyColor(scene.difficulty)}`,
                  color: difficultyColor(scene.difficulty),
                }}
              >
                <span>★</span>
                <span className="tabular-nums font-bold">{scene.difficulty.toFixed(2)}</span>
              </span>
            </div>
            <div className="mt-3">
              <LeaderboardTabStrip scene={scene} active={tab} />
            </div>
          </header>

          {/* Grid-stack (not absolute) filling the fixed panel height — podium +
              a scrollable list. `grid-rows-1` makes the single row stretch to the
              cell so the list flexes into all remaining space (constant size, so
              the tab cross-fade never resizes). Both boards share the one cell
              during the slide; no overflow clip, so the slide tucks into the
              panel padding rather than cropping the list. */}
          <div className="grid grid-rows-1 mt-5 flex-1 min-h-0">
            <AnimatePresence initial={false}>
              <motion.div
                key={tab}
                className="flex flex-col h-full min-h-0"
                style={{ gridArea: "1 / 1" }}
                variants={boardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                {isLoading ? (
                  <Status text="Loading…" />
                ) : isError ? (
                  <Status text={tab === "local" ? "Failed to load" : "Offline"} />
                ) : rows.length === 0 ? (
                  <Status text="No scores yet" />
                ) : (
                  <div className="flex flex-col min-h-0 h-full">
                    <ScorePodium entries={podium} currentRank={currentIndex >= 0 && currentIndex < 3 ? currentIndex + 1 : null} />
                    {rest.length > 0 && (
                      <RankList
                        rows={rest}
                        selectedIndex={selectedIndex}
                        highlightIndex={currentIndex >= 3 ? currentIndex - 3 : -1}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {current && <SelfFooter row={currentIndex >= 0 ? rows[currentIndex] : null} rank={currentIndex + 1} />}
        </motion.div>

        <motion.div
          className="mt-7 flex items-center gap-5 text-[11px] text-white/40 tracking-[0.35em] uppercase"
          {...hintMotion}
        >
          <HintBar
            items={[
              { key: "↑↓", label: "Scroll" },
              { key: "LR", label: "Switch board" },
              { key: "B", label: "Back" },
            ]}
          />
        </motion.div>
      </div>
    </motion.div>
  );
};

/**
 * The ranked list below the podium (places #4 and down), scrollable within a
 * capped height so a long board never pushes the panel off-screen. The cursor
 * row is ring-focused and scrolled into view as up/down (or the stick) moves it;
 * `highlightIndex` (the just-played run, when in this list) gets the filled
 * highlight so it stands out even while the cursor is elsewhere.
 */
const RankList = ({
  rows,
  selectedIndex,
  highlightIndex,
}: {
  rows: LeaderboardRow[];
  selectedIndex: number;
  highlightIndex: number;
}) => {
  const focusedRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    focusedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <div className="mt-5 pt-4 border-t border-white/10 flex-1 min-h-0 flex flex-col">
      <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.3em] text-white/30">Rankings</p>
      {/* px/py give the focused row's ring room at the list's resting edges;
          scroll-py keeps scrollIntoView from parking a row flush against the clip
          edge mid-scroll, which would otherwise crop the ring's top/bottom. */}
      <ol
        className="flex-1 min-h-0 flex flex-col gap-0.5 overflow-y-auto px-1.5 py-1 scroll-py-2"
        style={{ scrollbarWidth: "thin" }}
      >
        {rows.map((row, i) => (
          <ScoreRow
            key={row.key}
            ref={i === selectedIndex ? focusedRef : null}
            rank={i + 4}
            playerName={row.playerName}
            avatarUrl={row.avatarUrl}
            score={row.score}
            accuracy={row.accuracy}
            maxCombo={row.maxCombo}
            missCount={row.missCount}
            mods={row.mods}
            highlighted={i === highlightIndex}
            focused={i === selectedIndex}
          />
        ))}
      </ol>
    </div>
  );
};

const LeaderboardTabStrip = ({ scene, active }: { scene: BeatmapLeaderboardScene; active: LeaderboardTab }) => (
  <div className="flex items-center justify-center gap-2">
    <BumperHint label="L" />
    <div className="flex items-center gap-1">
      {LEADERBOARD_TABS.map((id) => {
        const meta = TAB_META[id];
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => scene.setTab(id)}
            className={`relative px-3.5 py-2 text-xs tracking-[0.2em] uppercase transition-colors pointer-events-auto ${
              isActive ? "text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {meta.label}
            {isActive && (
              <motion.span
                layoutId="bm-leaderboard-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                style={{ background: meta.accent, boxShadow: `0 0 8px ${meta.accent}aa` }}
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
          </button>
        );
      })}
    </div>
    <BumperHint label="R" />
  </div>
);

/**
 * The signed-in player's own row, pinned below the board so they can always find
 * themselves. Always rendered at a fixed height (a muted placeholder when the
 * player isn't on the board) so switching tabs never resizes the panel.
 */
const SelfFooter = ({ row, rank }: { row: LeaderboardRow | null; rank: number }) => (
  <div className="mt-5 h-[52px] shrink-0 flex items-center gap-3 px-3 rounded-md border border-white/15 bg-white/[0.05]">
    {row ? (
      <SelfScoreRow rank={rank} playerName={row.playerName} avatarUrl={row.avatarUrl} score={row.score} />
    ) : (
      <span className="flex-1 text-center text-[11px] uppercase tracking-[0.25em] text-white/35">Not ranked yet</span>
    )}
  </div>
);

const BumperHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-7 h-6 px-2 rounded border border-white/30 text-xs font-bold tracking-wider text-white/70"
    aria-hidden
  >
    {label}
  </span>
);

const Status = ({ text }: { text: string }) => (
  <div className="flex-1 flex items-center justify-center text-xs text-white/50 tracking-[0.2em] uppercase py-8">
    {text}
  </div>
);
