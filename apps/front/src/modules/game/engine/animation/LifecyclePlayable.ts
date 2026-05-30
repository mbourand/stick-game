import type { Playable } from "./Playable";

/**
 * Shared scaffolding for every Playable: the `done` promise, the paused /
 * finished / cancelled flags, and the standard `pause` / `resume` / `cancel`
 * semantics. Subclasses focus on what they actually animate by implementing
 * `tick(dt)` and (optionally) overriding `onPause` / `onResume` / `onCancel`
 * to propagate to children.
 *
 * `update(dt)` here handles the universal early-outs (finished, paused, dt≤0)
 * and delegates to `tick(dt)` for the real work. Subclasses call
 * `this.finish()` to resolve `done` cleanly.
 */
export abstract class LifecyclePlayable implements Playable {
  public readonly done: Promise<void>;

  protected paused = false;
  protected finished = false;
  protected cancelled = false;
  private resolveDone!: () => void;

  constructor() {
    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
  }

  public update(dt: number): number {
    if (this.finished) return dt;
    if (this.paused || dt <= 0) return 0;
    return this.tick(dt);
  }

  /** Subclass hook: advance state by `dt` and return leftover dt. */
  protected abstract tick(dt: number): number;

  public isFinished(): boolean {
    return this.finished;
  }

  public isCancelled(): boolean {
    return this.cancelled;
  }

  public pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.onPause();
  }

  public resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.onResume();
  }

  public cancel(): void {
    if (this.finished) return;
    this.cancelled = true;
    this.onCancel();
    this.finish();
  }

  /** Resolve `done` and mark finished. Idempotent. */
  protected finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveDone();
  }

  protected onPause(): void {}
  protected onResume(): void {}
  protected onCancel(): void {}
}
