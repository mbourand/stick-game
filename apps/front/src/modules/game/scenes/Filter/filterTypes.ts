export type DifficultyFilter = { min: number; max: number };

/**
 * Upper bound of the difficulty slider. When the max thumb is parked here
 * we treat the filter as having no upper limit (∞), so beatmaps above this
 * rating still pass.
 */
export const DIFFICULTY_SLIDER_MAX = 10;
