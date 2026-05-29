/**
 * Choreography timings. Kept centralised so canvas-side waits stay in sync
 * with the CSS / motion durations baked into the scene views — tweak in
 * one place when polishing the feel.
 *
 * Convention: durations are in milliseconds (same as TickContext.dt).
 */

/**
 * The single source of truth for how long a scene's UI takes to play its
 * `entering` / `exiting` motion variants. The DOM side reads this via
 * SCENE_TRANSITION_DURATION_S; canvas timelines read the EXIT_/ENTER_
 * aliases below so call sites stay self-documenting.
 */
export const SCENE_TRANSITION_DURATION_MS = 350;
export const SCENE_TRANSITION_DURATION_S = SCENE_TRANSITION_DURATION_MS / 1000;

/** How long a scene's UI takes to play its `exiting` motion variant. */
export const EXIT_DURATION_MS = SCENE_TRANSITION_DURATION_MS;

/** How long a scene's UI takes to play its `entering` motion variant. */
export const ENTER_DURATION_MS = SCENE_TRANSITION_DURATION_MS;

/**
 * How long a scene's canvas-side content fades for during its exit. Shorter
 * than the UI exit so the canvas is fully gone before the ring resizes.
 */
export const EXIT_FADE_DURATION_MS = SCENE_TRANSITION_DURATION_MS / 2;

/** How long the persistent ring takes to resize between scenes. */
export const CIRCLE_RESIZE_DURATION_MS = 450;
