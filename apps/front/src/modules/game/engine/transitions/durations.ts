/**
 * Choreography timings. Kept centralised so canvas-side waits stay in sync
 * with the CSS / motion durations baked into the scene views — tweak in
 * one place when polishing the feel.
 *
 * Convention: durations are in milliseconds (same as TickContext.dt).
 */

/** How long a scene's UI takes to play its `exiting` motion variant. */
export const EXIT_DURATION_MS = 350;

/** How long a scene's UI takes to play its `entering` motion variant. */
export const ENTER_DURATION_MS = 350;

/** How long the persistent ring takes to resize between scenes. */
export const CIRCLE_RESIZE_DURATION_MS = 450;
