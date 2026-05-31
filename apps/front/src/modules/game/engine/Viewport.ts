import { Store } from "./state/Store";

/**
 * The fixed virtual resolution every scene is laid out in. All the px-based
 * layout constants (circle radii, button sizes, offsets) are authored in this
 * design space; at runtime a single uniform `scale` maps that space onto the
 * actual viewport (contain fit), so the composition keeps its proportions and
 * never overflows — independent of browser zoom or device pixel ratio.
 *
 * The box must be at least as large as the widest/tallest scene, or contain-fit
 * leaves that scene overflowing at scale 1. The binding scene is beatmap
 * selection: its radial buttons reach
 * `CIRCLE_RADIUS_PX (460) + BUTTON_WIDTH_PX (520) + glow (~22) ≈ 1002px` from
 * centre on each side → ~2005px of content. `DESIGN_WIDTH` bounds that with a
 * margin so the buttons clear the screen edges; `DESIGN_HEIGHT` is 16:9-ish and
 * comfortably clears the 920px circle. Bump these if a scene ever grows past
 * them. (Width-bound on 16:9 displays, so the scene is slightly letterboxed
 * top/bottom — expected, since the composition is wider than 16:9.)
 */
export const DESIGN_WIDTH = 2120;
export const DESIGN_HEIGHT = 1080;

/**
 * Upper bound on the device pixel ratio we render the canvas backing store at.
 * The backing store costs `cssW * cssH * dpr²` pixels, and every alpha/filter
 * composited Container allocates an offscreen that size — so an uncapped dpr
 * (browser zoom inflates it well past the physical 2× on HiDPI panels) balloons
 * memory and per-frame fill for no visible sharpness gain. 2× is past the point
 * most displays resolve.
 */
export const MAX_DEVICE_PIXEL_RATIO = 2;

/** The effective dpr we render at: the device's, clamped to MAX_DEVICE_PIXEL_RATIO. */
export function effectiveDpr(devicePixelRatio: number): number {
  return Math.min(Math.max(1, devicePixelRatio), MAX_DEVICE_PIXEL_RATIO);
}

export type ViewportMetrics = {
  /** CSS-pixel size of the viewport (window.innerWidth / innerHeight). */
  cssWidth: number;
  cssHeight: number;
  /** Device pixel ratio the canvas backing store is rendered at. */
  dpr: number;
  /**
   * Uniform design→screen scale: `min(cssW / DESIGN_W, cssH / DESIGN_H)`.
   * Both the canvas content and the DOM overlay multiply by this so they stay
   * pixel-locked and shrink/grow together to fit the viewport.
   */
  scale: number;
};

/** Largest uniform scale that keeps the whole design box inside the viewport (contain). */
export function computeViewportScale(cssWidth: number, cssHeight: number): number {
  return Math.min(cssWidth / DESIGN_WIDTH, cssHeight / DESIGN_HEIGHT);
}

export function createViewportStore(): Store<ViewportMetrics> {
  return new Store<ViewportMetrics>({
    cssWidth: DESIGN_WIDTH,
    cssHeight: DESIGN_HEIGHT,
    dpr: 1,
    scale: 1,
  });
}
