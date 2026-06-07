import { GRADE_COLOR } from "@/modules/game/score/grade";

/**
 * The global player-ranking boards. Mirrors the backend `metric` enum (and its
 * order); the bumpers cycle through them in this order.
 */
export type PlayerRankingMetric = "sss" | "fc" | "ssPlus" | "playCount";

export const PLAYER_RANKING_METRICS: readonly PlayerRankingMetric[] = ["sss", "ssPlus", "fc", "playCount"];

/** Step to the next/previous board, wrapping around the ends. */
export const cyclePlayerRankingMetric = (current: PlayerRankingMetric, dir: -1 | 1): PlayerRankingMetric => {
  const next =
    (PLAYER_RANKING_METRICS.indexOf(current) + dir + PLAYER_RANKING_METRICS.length) % PLAYER_RANKING_METRICS.length;
  return PLAYER_RANKING_METRICS[next];
};

export type PlayerRankingMeta = {
  /** Board title shown in the header. */
  title: string;
  /** Short label for the tab strip (e.g. "SSS", "Plays"). */
  tab: string;
  /** One-line description under the title. */
  blurb: string;
  /** Short unit appended to each value (e.g. "42 SSS"). */
  unit: string;
  /** Accent colour for the board — tints the tab, value text and podium. */
  accent: string;
};

export const PLAYER_RANKING_META: Record<PlayerRankingMetric, PlayerRankingMeta> = {
  sss: {
    title: "Most SSS",
    tab: "SSS",
    blurb: "Players with the most perfect (100%) plays",
    unit: "SSS",
    accent: GRADE_COLOR.SSS,
  },
  fc: {
    title: "Most Full Combos",
    tab: "FC",
    blurb: "Players with the most no-miss plays",
    unit: "FC",
    accent: "#7ee081",
  },
  ssPlus: {
    title: "Most SS+",
    tab: "SS+",
    blurb: "Players with the most SS+ or better full combos",
    unit: "SS+",
    accent: GRADE_COLOR["SS+"],
  },
  playCount: {
    title: "Most Plays",
    tab: "Plays",
    blurb: "Players who've played the most",
    unit: "plays",
    accent: "#69b4ff",
  },
};
