/**
 * Drives a `requestAnimationFrame` callback loop, computes `dt` between
 * frames, and counts frames. Owns nothing application-specific — the only
 * thing it knows is how to call `onTick(dt, frame)` once per RAF until
 * `stop()`.
 */
export class FrameLoop {
  private rafId: number | null = null;
  private running = false;
  private lastFrameTime = 0;
  private frame = 0;
  private onTick: ((dt: number, frame: number) => void) | null = null;

  public start(onTick: (dt: number, frame: number) => void): void {
    if (this.running) return;
    this.onTick = onTick;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.onTick = null;
  }

  public isRunning(): boolean {
    return this.running;
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frame += 1;
    this.onTick?.(dt, this.frame);
    if (this.running) this.rafId = requestAnimationFrame(this.loop);
  };
}
