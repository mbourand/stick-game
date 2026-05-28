import { linear, type EasingFn } from "./Easing";
import type { Playable } from "./Playable";

/** Keys of T whose value type is `number` — the only ones a Tween can drive. */
export type NumericKeys<T> = {
  [K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

export type TweenTargets<T> = Partial<Record<NumericKeys<T>, number>>;

export type TweenOptions<T extends object> = {
  target: T;
  to: TweenTargets<T>;
  /**
   * Optional explicit starting values. Any key not listed here is captured
   * from the target the moment the tween begins playing (after `delay`).
   */
  from?: TweenTargets<T>;
  /** Total tween duration in milliseconds. */
  duration: number;
  /** Delay in milliseconds before the tween starts moving. */
  delay?: number;
  easing?: EasingFn;
  /** Called every frame the tween advances, with the eased progress ∈ [0,1]. */
  onUpdate?: (target: T, easedProgress: number) => void;
  onComplete?: () => void;
};

/**
 * Tweens a set of numeric properties on `target` from their current values
 * (snapshot at first effective frame) to the given `to` values, over
 * `duration` ms, using `easing`.
 *
 * Lifecycle:
 *   - Created → idle until first `update(dt)`.
 *   - First update past `delay` snapshots `from` values (unless provided).
 *   - Each subsequent update interpolates and writes to `target`.
 *   - Reaching duration → `onComplete` fires, `done` resolves.
 *   - `cancel()` resolves `done` without snapping to final values.
 */
export class Tween<T extends object> implements Playable {
  public readonly done: Promise<void>;

  private readonly target: T;
  private readonly toValues: Map<keyof T, number>;
  private readonly explicitFromValues: Map<keyof T, number>;
  private readonly fromValues = new Map<keyof T, number>();
  private readonly duration: number;
  private readonly delay: number;
  private readonly easing: EasingFn;
  private readonly onUpdate?: (target: T, easedProgress: number) => void;
  private readonly onComplete?: () => void;

  private elapsed = 0;
  private fromCaptured = false;
  private paused = false;
  private finished = false;
  private cancelled = false;
  private resolveDone!: () => void;

  constructor(opts: TweenOptions<T>) {
    this.target = opts.target;
    this.duration = Math.max(0, opts.duration);
    this.delay = Math.max(0, opts.delay ?? 0);
    this.easing = opts.easing ?? linear;
    this.onUpdate = opts.onUpdate;
    this.onComplete = opts.onComplete;

    this.toValues = new Map();
    this.explicitFromValues = new Map();
    for (const key in opts.to) {
      const k = key as unknown as keyof T;
      const value = opts.to[key as NumericKeys<T>];
      if (value === undefined) continue;
      this.toValues.set(k, value);
    }
    if (opts.from) {
      for (const key in opts.from) {
        const k = key as unknown as keyof T;
        const value = opts.from[key as NumericKeys<T>];
        if (value === undefined) continue;
        this.explicitFromValues.set(k, value);
      }
    }

    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
  }

  public update(dt: number): number {
    if (this.finished) return dt;
    if (this.paused || dt <= 0) return 0;

    this.elapsed += dt;

    if (this.elapsed < this.delay) return 0;

    if (!this.fromCaptured) this.captureFrom();

    const activeElapsed = this.elapsed - this.delay;
    const progress = this.duration === 0 ? 1 : Math.min(1, activeElapsed / this.duration);
    const eased = this.easing(progress);

    for (const [key, to] of this.toValues) {
      const from = this.fromValues.get(key) ?? 0;
      (this.target as Record<keyof T, number>)[key] = from + (to - from) * eased;
    }

    this.onUpdate?.(this.target, eased);

    if (progress >= 1) {
      this.finished = true;
      this.onComplete?.();
      this.resolveDone();
      return Math.max(0, activeElapsed - this.duration);
    }

    return 0;
  }

  public isFinished(): boolean {
    return this.finished;
  }

  public isCancelled(): boolean {
    return this.cancelled;
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public cancel(): void {
    if (this.finished) return;
    this.cancelled = true;
    this.finished = true;
    this.resolveDone();
  }

  private captureFrom(): void {
    for (const key of this.toValues.keys()) {
      const explicit = this.explicitFromValues.get(key);
      if (explicit !== undefined) {
        this.fromValues.set(key, explicit);
      } else {
        const current = (this.target as Record<keyof T, number>)[key];
        this.fromValues.set(key, typeof current === "number" ? current : 0);
      }
    }
    this.fromCaptured = true;
  }
}

export function tween<T extends object>(opts: TweenOptions<T>): Tween<T> {
  return new Tween(opts);
}
