import type { Store } from "./state/Store";
import {
  computeViewportScale,
  effectiveDpr,
  type ViewportMetrics,
} from "./Viewport";

/**
 * Owns the `<canvas>` element and everything about turning it into a drawable
 * surface: the cached 2d context, sizing the backing store to the viewport at
 * device-pixel resolution, keeping that in sync on resize, and publishing the
 * resulting metrics to the viewport store. The Engine just asks it to `clear()`
 * each frame and hands `context` to the scene manager.
 *
 * The backing store is `css * dpr` device px while the element stays `css` px
 * on screen; canvas scenes fold `dpr * scale` into their root transform so
 * design-space content lands at the right on-screen size.
 */
export class CanvasSurface {
  public readonly canvas: HTMLCanvasElement;
  public readonly context: CanvasRenderingContext2D;

  constructor(
    canvas: HTMLCanvasElement,
    private readonly viewport: Store<ViewportMetrics>,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2d context from canvas");
    this.canvas = canvas;
    this.context = ctx;
    this.sync();
    window.addEventListener("resize", this.onResize);
  }

  public clear(color: string): void {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public destroy(): void {
    window.removeEventListener("resize", this.onResize);
  }

  private onResize = (): void => this.sync();

  private sync(): void {
    const dpr = effectiveDpr(window.devicePixelRatio || 1);
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));

    this.viewport.set({
      cssWidth,
      cssHeight,
      dpr,
      scale: computeViewportScale(cssWidth, cssHeight),
    });
  }
}
