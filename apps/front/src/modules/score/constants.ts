/**
 * Schema version stamped on submitted/persisted scores. Scores are only ever
 * compared against others of the same version, so leaderboard queries and score
 * submission must agree on this single source of truth.
 */
export const LATEST_SCORE_VERSION = 3;
