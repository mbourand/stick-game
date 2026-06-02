import { linear, type EasingFn } from "./Easing";
import { LifecyclePlayable } from "./LifecyclePlayable";

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
export class Tween<T extends object> extends LifecyclePlayable {
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

  constructor(opts: TweenOptions<T>) {
    super();
    this.target = opts.target;
    this.duration = Math.max(0, opts.duration);
    this.delay = Math.max(0, opts.delay ?? 0);
    this.easing = opts.easing ?? linear;
    this.onUpdate = opts.onUpdate;
    this.onComplete = opts.onComplete;
    this.toValues = collectNumericTargets(opts.to);
    this.explicitFromValues = collectNumericTargets(opts.from);
  }

  protected tick(dt: number): number {
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
      this.onComplete?.();
      this.finish();
      return Math.max(0, activeElapsed - this.duration);
    }

    return 0;
  }

  private captureFrom(): void {
    for (const key of this.toValues.keys()) {
      this.fromValues.set(key, resolveFromValue(this.target, key, this.explicitFromValues.get(key)));
    }
    this.fromCaptured = true;
  }
}

export function tween<T extends object>(opts: TweenOptions<T>): Tween<T> {
  return new Tween(opts);
}

/** Shared by Tween/Spring: turn a `Partial<Record<NumericKeys<T>, number>>` map into a `Map<keyof T, number>`, skipping undefineds. */
export function collectNumericTargets<T extends object>(
  values: TweenTargets<T> | undefined,
): Map<keyof T, number> {
  const map = new Map<keyof T, number>();
  if (!values) return map;
  for (const key in values) {
    const k = key as unknown as keyof T;
    const v = values[key as NumericKeys<T>];
    if (v === undefined) continue;
    map.set(k, v);
  }
  return map;
}

/**
 * Shared by Tween/Spring: resolve a property's starting value — the explicit
 * `from` if one was given, otherwise the target's current numeric value, falling
 * back to 0 for non-numeric/undefined fields.
 */
export function resolveFromValue<T extends object>(
  target: T,
  key: keyof T,
  explicit: number | undefined,
): number {
  if (explicit !== undefined) return explicit;
  const current = (target as Record<keyof T, number>)[key];
  return typeof current === "number" ? current : 0;
}
