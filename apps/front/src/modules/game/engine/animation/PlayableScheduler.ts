import type { Playable } from "./Playable";

/**
 * Owns a list of currently-running playables and ticks them every frame.
 *
 * Time scale:
 *   - `update(dt)` is expected to be called with the same `dt` in milliseconds
 *     that the engine uses everywhere else (see TickContext.dt).
 *   - Multiply by `timeScale` to slow / speed things up uniformly.
 *
 * Pause:
 *   - `pause()` halts the scheduler entirely without touching child state.
 *     Active playables resume from exactly where they left off.
 *
 * Newly-played playables are queued and only join the active list at the
 * START of the next `update()` — this avoids a playable being mutated by a
 * callback of another playable in the same frame (e.g. `call(() => sched.play(t))`).
 */
export class PlayableScheduler {
  private active: Playable[] = [];
  private pending: Playable[] = [];
  private paused = false;
  private timeScale = 1;

  /** Schedule a playable for ticking. Returns its `done` Promise. */
  public play(playable: Playable): Promise<void> {
    this.pending.push(playable);
    return playable.done;
  }

  /** Advance the scheduler. Pass the engine's frame `dt` in milliseconds. */
  public update(dt: number): void {
    this.flushPending();

    if (this.paused || dt <= 0) return;

    const scaled = dt * this.timeScale;
    if (scaled <= 0) return;

    for (let i = this.active.length - 1; i >= 0; i--) {
      const playable = this.active[i];
      playable.update(scaled);
      if (playable.isFinished()) this.active.splice(i, 1);
    }
  }

  /** Halt advancement. Playables retain their state. */
  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Uniformly scale time. 1 = realtime, 0.5 = half speed, 2 = double speed.
   * Negative values are clamped to 0.
   */
  public setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale);
  }

  public getTimeScale(): number {
    return this.timeScale;
  }

  /**
   * Cancel every active and pending playable. Each resolves its `done` Promise
   * without snapping to final values — callers that need a "fast-forward" can
   * `set()` to the final state themselves.
   */
  public cancelAll(): void {
    for (const p of this.active) {
      if (!p.isFinished()) p.cancel();
    }
    this.active.length = 0;
    for (const p of this.pending) {
      if (!p.isFinished()) p.cancel();
    }
    this.pending.length = 0;
  }

  /** Cancel a specific playable. Returns true if it was found and cancelled. */
  public cancel(playable: Playable): boolean {
    const activeIndex = this.active.indexOf(playable);
    if (activeIndex !== -1) {
      if (!playable.isFinished()) playable.cancel();
      this.active.splice(activeIndex, 1);
      return true;
    }
    const pendingIndex = this.pending.indexOf(playable);
    if (pendingIndex !== -1) {
      if (!playable.isFinished()) playable.cancel();
      this.pending.splice(pendingIndex, 1);
      return true;
    }
    return false;
  }

  public get activeCount(): number {
    return this.active.length + this.pending.length;
  }

  private flushPending(): void {
    if (this.pending.length === 0) return;
    for (const p of this.pending) this.active.push(p);
    this.pending.length = 0;
  }
}
