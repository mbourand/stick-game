import { LifecyclePlayable } from "./LifecyclePlayable";
import { collectNumericTargets, resolveFromValue, type TweenTargets } from "./Tween";

export type SpringOptions<T extends object> = {
  target: T;
  to: TweenTargets<T>;
  from?: TweenTargets<T>;
  /** Initial velocity, applied to every animated property (units / second). */
  initialVelocity?: number;
  /** Damped harmonic oscillator parameters. Defaults match react-spring's "default". */
  mass?: number;
  stiffness?: number;
  damping?: number;
  /**
   * Rest detection threshold: a property is "at rest" when both the distance
   * to the target and the velocity are below `precision` (in target units).
   */
  precision?: number;
  delay?: number;
  onUpdate?: (target: T) => void;
  onComplete?: () => void;
};

type SpringState = {
  position: number;
  velocity: number;
  to: number;
};

const SUBSTEP_MS = 4;

/**
 * Physics-based animation. Each animated property is modeled as a damped
 * harmonic oscillator (mass / stiffness / damping). Springs have no fixed
 * duration — they finish when every property has come to rest within
 * `precision` of its target.
 *
 * dt is sliced into ~4ms substeps before integration so high-frame-time
 * spikes don't blow up the simulation.
 */
export class Spring<T extends object> extends LifecyclePlayable {
  private readonly target: T;
  private readonly explicitFromValues: Map<keyof T, number>;
  private readonly toValues: Map<keyof T, number>;
  private readonly states = new Map<keyof T, SpringState>();
  private readonly mass: number;
  private readonly stiffness: number;
  private readonly damping: number;
  private readonly precision: number;
  private readonly initialVelocity: number;
  private readonly delay: number;
  private readonly onUpdate?: (target: T) => void;
  private readonly onComplete?: () => void;

  private elapsed = 0;
  private captured = false;

  constructor(opts: SpringOptions<T>) {
    super();
    this.target = opts.target;
    this.mass = opts.mass ?? 1;
    this.stiffness = opts.stiffness ?? 170;
    this.damping = opts.damping ?? 26;
    this.precision = opts.precision ?? 0.01;
    this.initialVelocity = opts.initialVelocity ?? 0;
    this.delay = Math.max(0, opts.delay ?? 0);
    this.onUpdate = opts.onUpdate;
    this.onComplete = opts.onComplete;
    this.toValues = collectNumericTargets(opts.to);
    this.explicitFromValues = collectNumericTargets(opts.from);
  }

  protected tick(dt: number): number {
    this.elapsed += dt;
    if (this.elapsed < this.delay) return 0;

    if (!this.captured) this.capture();

    let remainingMs = Math.min(dt, this.elapsed - this.delay);

    while (remainingMs > 0 && !this.atRest()) {
      const stepMs = Math.min(SUBSTEP_MS, remainingMs);
      this.physicsStep(stepMs / 1000);
      remainingMs -= stepMs;
    }

    for (const [key, state] of this.states) {
      (this.target as Record<keyof T, number>)[key] = state.position;
    }

    this.onUpdate?.(this.target);

    if (this.atRest()) {
      for (const [key, state] of this.states) {
        state.position = state.to;
        (this.target as Record<keyof T, number>)[key] = state.to;
      }
      this.onComplete?.();
      this.finish();
    }

    return 0;
  }

  private capture(): void {
    for (const [key, to] of this.toValues) {
      this.states.set(key, {
        position: resolveFromValue(this.target, key, this.explicitFromValues.get(key)),
        velocity: this.initialVelocity,
        to,
      });
    }
    this.captured = true;
  }

  private physicsStep(dtSec: number): void {
    for (const state of this.states.values()) {
      const displacement = state.position - state.to;
      const springForce = -this.stiffness * displacement;
      const dampingForce = -this.damping * state.velocity;
      const acceleration = (springForce + dampingForce) / this.mass;
      state.velocity += acceleration * dtSec;
      state.position += state.velocity * dtSec;
    }
  }

  private atRest(): boolean {
    for (const state of this.states.values()) {
      if (
        Math.abs(state.velocity) > this.precision ||
        Math.abs(state.position - state.to) > this.precision
      ) {
        return false;
      }
    }
    return this.states.size > 0;
  }
}

export function spring<T extends object>(opts: SpringOptions<T>): Spring<T> {
  return new Spring(opts);
}
