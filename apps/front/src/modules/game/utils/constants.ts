export const GAME_CIRCLE_RADIUS = 300;
export const GAME_CIRCLE_STROKE_WIDTH = 10;
export const GAME_CIRCLE_DISPLAYED_RADIUS = GAME_CIRCLE_RADIUS + GAME_CIRCLE_STROKE_WIDTH;

/** Displayed gameplay ring radius scaled by the user's circle-size setting (1 = default). */
export const scaledGameplayRingRadius = (scale: number) => GAME_CIRCLE_DISPLAYED_RADIUS * scale;

/** Radius used when the scores screen is showing — large enough to fit the hero, tabs, and a scrollable leaderboard. */
export const SCORES_CIRCLE_RADIUS = 440;

/** Radius used in beatmap selection — larger so more buttons fit along the curve. */
export const BEATMAP_SELECTION_CIRCLE_RADIUS = 460;
