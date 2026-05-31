import { Store } from "./state/Store";

/**
 * The fixed virtual resolution every scene is laid out in. All the px-based
 * layout constants (circle radii, button sizes, offsets) are authored in this
 * design space; at runtime a single uniform `scale` maps that space onto the
 * actual viewport (contain fit), so the composition keeps its proportions and
 * never overflows — independent of browser zoom or device pixel ratio.
 */
export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

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
