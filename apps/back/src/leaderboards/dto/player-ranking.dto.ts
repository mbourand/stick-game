import z from "zod";

/**
 * The global player-ranking boards. Each maps to one precomputed column on the
 * `UserStats` materialized view:
 *  - `sss`        most SSS plays (accuracy = 100)
 *  - `fc`         most full combos (no-miss plays)
 *  - `ssPlus`     most SS+ or better full combos (no-miss, accuracy >= 98)
 *  - `playCount`  most plays submitted (attempts, not just personal bests)
 */
export const PLAYER_RANKING_METRICS = ["sss", "fc", "ssPlus", "playCount"] as const;
export type PlayerRankingMetric = (typeof PLAYER_RANKING_METRICS)[number];
export const PlayerRankingMetricSchema = z.enum(PLAYER_RANKING_METRICS);

/** One row of a player-ranking board: an account + its value for the metric. */
export const PlayerRankEntrySchema = z.strictObject({
  rank: z.number().int().positive(),
  userId: z.string(),
  username: z.string().min(1).max(32),
  avatarUrl: z.string().nullable(),
  value: z.number().int().nonnegative(),
});
export type PlayerRankEntry = z.infer<typeof PlayerRankEntrySchema>;
