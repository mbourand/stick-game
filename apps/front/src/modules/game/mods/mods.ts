import type { ParsedNote } from "../../osu/convert/OsuConverter";

/**
 * The set of gameplay modifiers active for a play. Currently only "rate", but
 * shaped as an object so new mods slot in without rippling through call sites
 * (score multiplier and the "is this modded?" check fold over all of them).
 */
export type ActiveMods = { rate: number };

export const RATE_MIN = 0.5;
export const RATE_MAX = 2;
export const RATE_STEP = 0.05;
export const RATE_DEFAULT = 1;

export const NO_MODS: ActiveMods = { rate: RATE_DEFAULT };

/**
 * Multiplier applied to the score cap. Rate gives diminishing returns: it tracks
 * the rate 1:1 while slowing down (0.5×→0.5, 1×→1) but only earns 0.4 of extra
 * score per point of rate above 1× (1.5×→1.2, 2×→1.4), so speeding up is worth
 * less than it costs in difficulty. Endpoints 0.5× and 2× are exact by design.
 * Future mods multiply their own factor in here.
 */
export const getScoreMultiplier = (mods: ActiveMods): number =>
  mods.rate <= RATE_DEFAULT ? mods.rate : RATE_DEFAULT + (mods.rate - RATE_DEFAULT) * 0.4;

/** Whether any mod is active (i.e. the play doesn't belong on the no-mods board). */
export const isModded = (mods: ActiveMods): boolean => mods.rate !== RATE_DEFAULT;

/** Human-readable mod summary, stored on the score and shown as a leaderboard badge. */
export const describeMods = (mods: ActiveMods): string =>
  isModded(mods) ? `Rate ×${mods.rate.toFixed(2)}` : "";

/**
 * Re-express note times in rate-adjusted ("real-time-equivalent") coordinates by
 * dividing every time field by `rate`. Combined with playing the audio at
 * `playbackRate = rate`, this keeps the whole timing pipeline (clock, scroll,
 * judge windows) working unchanged while only note density changes with rate.
 */
export const applyRateToNotes = (notes: ParsedNote[], rate: number): ParsedNote[] =>
  rate === RATE_DEFAULT
    ? notes
    : notes.map((note) => ({
        ...note,
        hitTime: note.hitTime / rate,
        holdDuration: note.holdDuration === undefined ? undefined : note.holdDuration / rate,
        holdTicksHitTimes: note.holdTicksHitTimes?.map((t) => t / rate),
      }));
