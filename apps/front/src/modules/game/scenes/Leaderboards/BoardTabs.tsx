import { motion } from "motion/react";
import { PLAYER_RANKING_META, PLAYER_RANKING_METRICS, type PlayerRankingMetric } from "./metrics";
import type { PlayerRankingsScene } from "./PlayerRankingsScene";

/**
 * The board switcher: a row of the four boards with the active one lit and an
 * accent underline that slides between tabs (shared `layoutId`). Clickable, and
 * flanked by the L/R bumper glyphs since the bumpers cycle the same set.
 */
export const BoardTabs = ({ scene, active }: { scene: PlayerRankingsScene; active: PlayerRankingMetric }) => (
  <div className="flex items-center justify-center gap-2">
    <BumperHint label="L" />
    <div className="flex items-center gap-1">
      {PLAYER_RANKING_METRICS.map((metric) => {
        const meta = PLAYER_RANKING_META[metric];
        const isActive = metric === active;
        return (
          <button
            key={metric}
            type="button"
            onClick={() => scene.setMetric(metric)}
            className={`relative px-3.5 py-2 text-xs tracking-[0.2em] uppercase transition-colors pointer-events-auto ${
              isActive ? "text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {meta.tab}
            {isActive && (
              <motion.span
                layoutId="board-tab-underline"
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

const BumperHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-7 h-6 px-2 rounded border border-white/30 text-xs font-bold tracking-wider text-white/70"
    aria-hidden
  >
    {label}
  </span>
);
