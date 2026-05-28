import type { Playable } from "./Playable";
import type { NumericKeys, TweenTargets } from "./Tween";

/** Shared lifecycle for compositions of playables. */
abstract class Composition implements Playable {
  public readonly done: Promise<void>;

  protected readonly children: Playable[];
  protected paused = false;
  protected finished = false;
  protected cancelled = false;
  protected resolveDone!: () => void;

  constructor(children: Playable[]) {
    this.children = children;
    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
  }

  public abstract update(dt: number): number;

  public isFinished(): boolean {
    return this.finished;
  }

  public isCancelled(): boolean {
    return this.cancelled;
  }

  public pause(): void {
    if (this.paused) return;
    this.paused = true;
    for (const child of this.children) child.pause();
  }

  public resume(): void {
    if (!this.paused) return;
    this.paused = false;
    for (const child of this.children) child.resume();
  }

  public cancel(): void {
    if (this.finished) return;
    this.cancelled = true;
    for (const child of this.children) {
      if (!child.isFinished()) child.cancel();
    }
    this.finished = true;
    this.resolveDone();
  }

  protected finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveDone();
  }
}

/**
 * Runs children one after another. Leftover dt from a finishing child flows
 * into the next, so zero-duration steps (Call, Set, Wait(0)) don't waste a
 * frame each and long sequences stay drift-free at boundaries.
 */
export class Sequence extends Composition {
  private index = 0;

  public update(dt: number): number {
    if (this.finished) return dt;
    if (this.paused) return 0;
    if (this.children.length === 0) {
      this.finish();
      return dt;
    }

    let remaining = dt;
    while (this.index < this.children.length) {
      const child = this.children[this.index];
      const leftover = child.update(remaining);
      if (!child.isFinished()) return 0;
      remaining = leftover;
      this.index++;
    }

    this.finish();
    return remaining;
  }
}

/**
 * Runs all children concurrently. Finishes when every child has finished.
 * Leftover dt isn't well-defined for parallel since children may finish at
 * different points in the frame; returns 0.
 */
export class Parallel extends Composition {
  public update(dt: number): number {
    if (this.finished) return dt;
    if (this.paused) return 0;
    if (this.children.length === 0) {
      this.finish();
      return dt;
    }

    let allDone = true;
    for (const child of this.children) {
      if (child.isFinished()) continue;
      child.update(dt);
      if (!child.isFinished()) allDone = false;
    }

    if (allDone) {
      this.finish();
      return 0;
    }
    return 0;
  }
}

/** Sleeps for `ms` milliseconds. Useful inside a Sequence as a gap. */
export class Wait implements Playable {
  public readonly done: Promise<void>;

  private elapsed = 0;
  private readonly duration: number;
  private paused = false;
  private finished = false;
  private resolveDone!: () => void;

  constructor(ms: number) {
    this.duration = Math.max(0, ms);
    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
    if (this.duration === 0) {
      this.finished = true;
      this.resolveDone();
    }
  }

  public update(dt: number): number {
    if (this.finished) return dt;
    if (this.paused || dt <= 0) return 0;
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      const leftover = this.elapsed - this.duration;
      this.finished = true;
      this.resolveDone();
      return leftover;
    }
    return 0;
  }

  public isFinished(): boolean {
    return this.finished;
  }
  public pause(): void {
    this.paused = true;
  }
  public resume(): void {
    this.paused = false;
  }
  public cancel(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveDone();
  }
}

/** Fires a callback once, the first frame it is updated. */
export class Call implements Playable {
  public readonly done: Promise<void>;

  private finished = false;
  private resolveDone!: () => void;

  constructor(private readonly fn: () => void) {
    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
  }

  public update(dt: number): number {
    if (this.finished) return dt;
    this.fn();
    this.finished = true;
    this.resolveDone();
    return dt;
  }

  public isFinished(): boolean {
    return this.finished;
  }
  public pause(): void {}
  public resume(): void {}
  public cancel(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveDone();
  }
}

/**
 * A Playable that never finishes on its own — it waits until `release()`
 * (or `cancel()`) is called externally. Use inside a Sequence to pause a
 * timeline on an external signal: a Promise, a DOM "exit animation finished"
 * callback, a network request, etc.
 *
 *   const g = gate();
 *   somePromise.then(() => g.release());
 *   scheduler.play(sequence([tween(...), g, tween(...)]));
 */
export class Gate implements Playable {
  public readonly done: Promise<void>;

  private finished = false;
  private resolveDone!: () => void;

  constructor() {
    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
  }

  public update(dt: number): number {
    return this.finished ? dt : 0;
  }

  public release(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveDone();
  }

  public isFinished(): boolean {
    return this.finished;
  }
  public pause(): void {}
  public resume(): void {}
  public cancel(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveDone();
  }
}

/** Snaps the target's properties to the given values in a single frame. */
export class SetValues<T extends object> implements Playable {
  public readonly done: Promise<void>;

  private finished = false;
  private resolveDone!: () => void;

  constructor(
    private readonly target: T,
    private readonly values: TweenTargets<T>,
  ) {
    this.done = new Promise<void>((resolve) => {
      this.resolveDone = resolve;
    });
  }

  public update(dt: number): number {
    if (this.finished) return dt;
    for (const key in this.values) {
      const value = this.values[key as NumericKeys<T>];
      if (value === undefined) continue;
      (this.target as Record<string, number>)[key] = value;
    }
    this.finished = true;
    this.resolveDone();
    return dt;
  }

  public isFinished(): boolean {
    return this.finished;
  }
  public pause(): void {}
  public resume(): void {}
  public cancel(): void {
    if (this.finished) return;
    this.finished = true;
    this.resolveDone();
  }
}

export const sequence = (children: Playable[]): Sequence => new Sequence(children);
export const parallel = (children: Playable[]): Parallel => new Parallel(children);
export const wait = (ms: number): Wait => new Wait(ms);
export const call = (fn: () => void): Call => new Call(fn);
export const gate = (): Gate => new Gate();
export const set = <T extends object>(target: T, values: TweenTargets<T>): SetValues<T> =>
  new SetValues(target, values);

/**
 * Runs children in parallel, but offsets each one's start by `gapMs * index`.
 * Useful for radial menus, list animations, etc.
 */
export const stagger = (children: Playable[], gapMs: number): Parallel =>
  parallel(children.map((child, i) => (i === 0 ? child : sequence([wait(gapMs * i), child]))));
