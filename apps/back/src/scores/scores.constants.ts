/**
 * The current score-calculation version. Submitted plays are stamped with this,
 * and it's the upper bound clients may query. Bumping the algorithm means
 * incrementing this single value rather than chasing literals across the DTOs.
 */
export const SCORE_VERSION = 3;
